import os
import requests
import time
import logging
from datetime import datetime, date
import pytz
from .database import get_db_connection, normalize_string

logger = logging.getLogger("market.service")

def sync_market_prices():
    """
    Ingests daily mandi price data from the official Government of India AGMARKNET API (data.gov.in).
    Performs dynamic pagination to download all available records, normalizes the string fields,
    validates data rows, and upserts them into SQLite databases to maintain clean daily history.
    """
    api_key = os.environ.get("DATA_GOV_API_KEY")
    resource_id = os.environ.get("DATA_GOV_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
    
    if not api_key:
        logger.warning("DATA_GOV_API_KEY is not configured in the environment. Skipping market price synchronization. Existing market data will be served.")
        return 0
        
    url = f"https://api.data.gov.in/resource/{resource_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    
    limit = 5000
    offset = 0
    total = None
    records_fetched = []
    
    # Update sync_metadata state to IN_PROGRESS
    with get_db_connection() as conn:
        conn.execute("UPDATE sync_metadata SET status = 'IN_PROGRESS' WHERE id = 1;")
        conn.commit()
        
    try:
        while total is None or offset < total:
            params = {
                "api-key": api_key,
                "format": "json",
                "limit": limit,
                "offset": offset
            }
            logger.info(f"Market Sync: Fetching offset={offset}, limit={limit}...")
            
            # Retry with exponential backoff
            retries = 3
            backoff = 1.5
            response_data = None
            for attempt in range(retries):
                try:
                    res = requests.get(url, params=params, headers=headers, timeout=35)
                    res.raise_for_status()
                    response_data = res.json()
                    break
                except Exception as e:
                    logger.warning(f"Market Sync: Attempt {attempt+1} failed: {e}")
                    if attempt == retries - 1:
                        raise e
                    time.sleep(backoff)
                    backoff *= 2
                    
            if not response_data:
                break
                
            total = response_data.get("total", 0)
            page_records = response_data.get("records", [])
            if not page_records:
                break
                
            records_fetched.extend(page_records)
            offset += limit
            
        logger.info(f"Market Sync: Fetched {len(records_fetched)} records from government source.")
        
        # Save to database
        successful_inserts = 0
        rejected_records = 0
        now_iso = datetime.utcnow().isoformat() + "Z"
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            for r in records_fetched:
                state = r.get("state")
                district = r.get("district")
                market = r.get("market")
                commodity = r.get("commodity")
                arrival_date_raw = r.get("arrival_date")
                
                # Validation 1: Required text fields
                if not state or not district or not market or not commodity or not arrival_date_raw:
                    rejected_records += 1
                    continue
                    
                # Validation 2: Price numbers
                try:
                    min_price = float(r.get("min_price", 0.0))
                    max_price = float(r.get("max_price", 0.0))
                    modal_price = float(r.get("modal_price", 0.0))
                    
                    if min_price < 0 or max_price < 0 or modal_price < 0:
                        raise ValueError("Prices cannot be negative.")
                except Exception:
                    rejected_records += 1
                    continue
                    
                # Validation 3: Parse and standardize dates to YYYY-MM-DD
                try:
                    arrival_date_raw = arrival_date_raw.strip()
                    if "/" in arrival_date_raw:
                        parts = arrival_date_raw.split("/")
                        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                        if not (1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2100):
                            raise ValueError()
                        date_val = f"{year:04d}-{month:02d}-{day:02d}"
                    else:
                        date_val = datetime.strptime(arrival_date_raw, "%Y-%m-%d").strftime("%Y-%m-%d")
                except Exception:
                    rejected_records += 1
                    continue
                    
                norm_state = normalize_string(state)
                norm_district = normalize_string(district)
                norm_market = normalize_string(market)
                norm_commodity = normalize_string(commodity)
                
                # Upsert into market master table
                cursor.execute("""
                    INSERT INTO market_master (
                        state, district, market, normalized_state, normalized_district, normalized_market, source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(normalized_state, normalized_district, normalized_market) DO UPDATE SET
                        state=excluded.state,
                        district=excluded.district,
                        market=excluded.market,
                        source=excluded.source;
                """, (state, district, market, norm_state, norm_district, norm_market, "AGMARKNET / DMI"))
                
                # Upsert into daily prices
                cursor.execute("""
                    INSERT INTO market_prices (
                        date, state, district, market,
                        normalized_state, normalized_district, normalized_market,
                        commodity, normalized_commodity, variety, grade,
                        min_price, max_price, modal_price,
                        source, source_url, fetched_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(date, normalized_market, normalized_commodity, variety, grade) DO UPDATE SET
                        min_price=excluded.min_price,
                        max_price=excluded.max_price,
                        modal_price=excluded.modal_price,
                        fetched_at=excluded.fetched_at;
                """, (
                    date_val, state, district, market,
                    norm_state, norm_district, norm_market,
                    commodity, norm_commodity, r.get("variety", "Other"), r.get("grade", "Local"),
                    min_price, max_price, modal_price,
                    "Government of India — AGMARKNET / DMI", url, now_iso
                ))
                successful_inserts += 1
                
            # Log successful sync
            cursor.execute("""
                UPDATE sync_metadata 
                SET last_successful_sync = ?, status = 'IDLE', error_message = NULL
                WHERE id = 1;
            """, (datetime.now().strftime("%d %b %Y %H:%M:%S"),))
            conn.commit()
            
        logger.info(f"Market Sync Complete. Upserted: {successful_inserts}, Rejected: {rejected_records}")
        return successful_inserts
    except Exception as exc:
        logger.warning(f"Market Sync could not complete: {exc}")
        try:
            with get_db_connection() as conn:
                conn.execute("""
                    UPDATE sync_metadata 
                    SET status = 'FAILED', error_message = ?
                    WHERE id = 1;
                """, (str(exc),))
                conn.commit()
        except Exception as db_err:
            logger.warning(f"Failed to record sync error metadata: {db_err}")
        return 0

def get_days_ago_str(date_str: str) -> str:
    """Calculates freshness duration relative to Asia/Kolkata timezone."""
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
        kolkata_tz = pytz.timezone("Asia/Kolkata")
        today = datetime.now(kolkata_tz).date()
        diff = (today - dt).days
        if diff <= 0:
            return "today"
        elif diff == 1:
            return "1 day ago"
        else:
            return f"{diff} days ago"
    except Exception:
        return "N/A"

def get_unique_states():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT state FROM market_master ORDER BY state;")
        rows = cursor.fetchall()
        states = [r["state"] for r in rows]
        # Return fallback list if database is empty on first run
        if not states:
            return ["Andhra Pradesh", "Karnataka", "Kerala", "Tamil Nadu", "Maharashtra", "Gujarat"]
        return states

def get_unique_districts(state: str = None):
    if not state:
        return []
    norm_state = normalize_string(state)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT district FROM market_master 
            WHERE normalized_state = ? 
            ORDER BY district;
        """, (norm_state,))
        rows = cursor.fetchall()
        return [r["district"] for r in rows]

def get_unique_markets(state: str = None, district: str = None):
    if not state or not district:
        return []
    norm_state = normalize_string(state)
    norm_district = normalize_string(district)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT market FROM market_master 
            WHERE normalized_state = ? AND normalized_district = ? 
            ORDER BY market;
        """, (norm_state, norm_district))
        rows = cursor.fetchall()
        return [r["market"] for r in rows]

def get_unique_commodities(state: str = None, district: str = None, market: str = None):
    norm_state = normalize_string(state) if state else None
    norm_district = normalize_string(district) if district else None
    norm_market = normalize_string(market) if market else None
    
    query = "SELECT DISTINCT commodity FROM market_prices WHERE 1=1"
    params = []
    if norm_state:
        query += " AND normalized_state = ?"
        params.append(norm_state)
    if norm_district:
        query += " AND normalized_district = ?"
        params.append(norm_district)
    if norm_market:
        query += " AND normalized_market = ?"
        params.append(norm_market)
    query += " ORDER BY commodity;"
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        commodities = [r["commodity"] for r in rows]
        if not commodities:
            # Global fallback
            cursor.execute("SELECT DISTINCT commodity FROM market_prices ORDER BY commodity LIMIT 50;")
            commodities = [r["commodity"] for r in cursor.fetchall()]
        return commodities

def get_unique_varieties(commodity: str = None, state: str = None, district: str = None, market: str = None):
    norm_state = normalize_string(state) if state else None
    norm_district = normalize_string(district) if district else None
    norm_market = normalize_string(market) if market else None
    norm_commodity = normalize_string(commodity) if commodity else None
    
    query = "SELECT DISTINCT variety FROM market_prices WHERE 1=1"
    params = []
    if norm_state:
        query += " AND normalized_state = ?"
        params.append(norm_state)
    if norm_district:
        query += " AND normalized_district = ?"
        params.append(norm_district)
    if norm_market:
        query += " AND normalized_market = ?"
        params.append(norm_market)
    if norm_commodity:
        query += " AND normalized_commodity = ?"
        params.append(norm_commodity)
        
    query += " ORDER BY variety;"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [r["variety"] for r in cursor.fetchall()]

def get_unique_grades(commodity: str = None, state: str = None, district: str = None, market: str = None):
    norm_state = normalize_string(state) if state else None
    norm_district = normalize_string(district) if district else None
    norm_market = normalize_string(market) if market else None
    norm_commodity = normalize_string(commodity) if commodity else None
    
    query = "SELECT DISTINCT grade FROM market_prices WHERE 1=1"
    params = []
    if norm_state:
        query += " AND normalized_state = ?"
        params.append(norm_state)
    if norm_district:
        query += " AND normalized_district = ?"
        params.append(norm_district)
    if norm_market:
        query += " AND normalized_market = ?"
        params.append(norm_market)
    if norm_commodity:
        query += " AND normalized_commodity = ?"
        params.append(norm_commodity)
        
    query += " ORDER BY grade;"
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [r["grade"] for r in cursor.fetchall()]

def get_filtered_prices(
    state: str = None, 
    district: str = None, 
    market: str = None, 
    commodity: str = None, 
    date_val: str = None,
    variety: str = None,
    grade: str = None
):
    """Retrieves data with lookback windows, dynamic date resolution and detailed schema mapping."""
    norm_state = normalize_string(state) if state else None
    norm_district = normalize_string(district) if district else None
    norm_market = normalize_string(market) if market else None
    norm_commodity = normalize_string(commodity) if commodity else None
    
    # 1. Resolve target date
    target_date = date_val
    days_ago_str = "today"
    
    # If no date is specified, lookup the most recent reporting date for this state + district
    if not target_date or target_date.strip().lower() == 'all':
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT DISTINCT date FROM market_prices WHERE 1=1"
            params = []
            if norm_state:
                query += " AND normalized_state = ?"
                params.append(norm_state)
            if norm_district:
                query += " AND normalized_district = ?"
                params.append(norm_district)
            query += " ORDER BY date DESC LIMIT 1;"
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            if row:
                resolved_latest_date = row["date"]
                days_ago_str = get_days_ago_str(resolved_latest_date)
                if not target_date:
                    target_date = resolved_latest_date
            else:
                resolved_latest_date = None
                
    # 2. Build full sql query
    query = "SELECT * FROM market_prices WHERE 1=1"
    params = []
    
    if norm_state:
        query += " AND normalized_state = ?"
        params.append(norm_state)
    if norm_district:
        query += " AND normalized_district = ?"
        params.append(norm_district)
    if norm_market:
        query += " AND normalized_market = ?"
        params.append(norm_market)
    if norm_commodity:
        query += " AND normalized_commodity = ?"
        params.append(norm_commodity)
        
    # Restrict by date only if:
    # 1. date_val is a specific date (not 'all', not empty)
    # 2. OR date_val is empty/None, but neither commodity nor market is specified (to avoid loading all dates for all crops on district load)
    if target_date and target_date.lower() != 'all':
        if date_val or not (norm_commodity or norm_market):
            query += " AND date = ?"
            params.append(target_date)
        
    if variety and variety.strip().lower() != 'all':
        query += " AND LOWER(variety) = ?"
        params.append(variety.strip().lower())
    if grade and grade.strip().lower() != 'all':
        query += " AND LOWER(grade) = ?"
        params.append(grade.strip().lower())
        
    query += " ORDER BY date DESC, market ASC;"
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        records = []
        for r in rows:
            # Parse YYYY-MM-DD back to DD/MM/YYYY for frontend compat
            try:
                date_obj = datetime.strptime(r["date"], "%Y-%m-%d")
                formatted_date = date_obj.strftime("%d/%m/%Y")
            except Exception:
                formatted_date = r["date"]
                
            records.append({
                "state": r["state"],
                "district": r["district"],
                "market": r["market"],
                "commodity": r["commodity"],
                "variety": r["variety"],
                "grade": r["grade"],
                "arrival_date": formatted_date,
                "min_price": r["min_price"],
                "max_price": r["max_price"],
                "modal_price": r["modal_price"],
                "source": r["source"],
                "source_url": r["source_url"],
                "fetched_at": r["fetched_at"]
            })
            
        return records, target_date, days_ago_str

def get_resolution_metadata(state: str, district: str):
    """
    Decides the final layout state (A, B, C, D, E) based on database records.
    """
    norm_state = normalize_string(state)
    norm_district = normalize_string(district)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Check metadata status
        cursor.execute("SELECT last_successful_sync, status, error_message FROM sync_metadata WHERE id = 1;")
        sync_meta = cursor.fetchone()
        last_sync = sync_meta["last_successful_sync"] if sync_meta else "N/A"
        
        # Check if database has any markets mapped to this state/district
        cursor.execute("SELECT COUNT(*) as count FROM market_master WHERE normalized_state = ? AND normalized_district = ?;", (norm_state, norm_district))
        market_count = cursor.fetchone()["count"]
        
        # Check if there are any prices
        cursor.execute("SELECT DISTINCT date FROM market_prices WHERE normalized_state = ? AND normalized_district = ? ORDER BY date DESC LIMIT 1;", (norm_state, norm_district))
        price_row = cursor.fetchone()
        
        if not price_row:
            if market_count > 0:
                # Case C: Markets exist, but no price updates today/recent
                cursor.execute("SELECT DISTINCT market FROM market_master WHERE normalized_state = ? AND normalized_district = ?;", (norm_state, norm_district))
                markets_list = [r["market"] for r in cursor.fetchall()]
                return {
                    "case": "C",
                    "markets": markets_list,
                    "last_sync": last_sync
                }
            else:
                # Case D: No markets mapped to this district
                # Let's find nearby markets in the same state as fallback
                cursor.execute("SELECT DISTINCT market, district FROM market_master WHERE normalized_state = ? LIMIT 10;", (norm_state,))
                nearby = [{"market": r["market"], "district": r["district"]} for r in cursor.fetchall()]
                return {
                    "case": "D",
                    "nearby_markets": nearby,
                    "last_sync": last_sync
                }
                
        # We have a date!
        latest_date = price_row["date"]
        days_ago_str = get_days_ago_str(latest_date)
        
        if days_ago_str == "today":
            return {
                "case": "A",
                "last_sync": last_sync
            }
        else:
            return {
                "case": "B",
                "last_sync": last_sync
            }

def get_market_summary(commodity: str = None, state: str = None, district: str = None):
    records, _, _ = get_filtered_prices(state=state, district=district, commodity=commodity)
    
    if not records:
        return {
            "commodity": commodity,
            "state": state,
            "district": district,
            "min_price": 0.0,
            "max_price": 0.0,
            "average_modal_price": 0.0,
            "number_of_markets": 0,
            "number_of_commodities": 0,
            "number_of_districts": 0,
            "number_of_states": 0,
            "latest_arrival_date": None
        }
        
    prices = []
    markets = set()
    commodities = set()
    districts = set()
    states = set()
    dates = []
    
    for r in records:
        prices.append((r["min_price"], r["max_price"], r["modal_price"]))
        markets.add(r["market"])
        commodities.add(r["commodity"])
        districts.add(r["district"])
        states.add(r["state"])
        dates.append(r["arrival_date"])
        
    min_prices = [p[0] for p in prices if p[0] > 0]
    max_prices = [p[1] for p in prices if p[1] > 0]
    modal_prices = [p[2] for p in prices if p[2] > 0]
    
    min_val = min(min_prices) if min_prices else 0.0
    max_val = max(max_prices) if max_prices else 0.0
    avg_modal = sum(modal_prices) / len(modal_prices) if modal_prices else 0.0
    
    latest_date = dates[0] if dates else None
    
    return {
        "commodity": commodity,
        "state": state,
        "district": district,
        "min_price": min_val,
        "max_price": max_val,
        "average_modal_price": round(avg_modal, 2),
        "number_of_markets": len(markets),
        "number_of_commodities": len(commodities),
        "number_of_districts": len(districts),
        "number_of_states": len(states),
        "latest_arrival_date": latest_date
    }

def get_market_overview_stats():
    """Computes top-level stats over the entire database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(DISTINCT state) as s, COUNT(DISTINCT district) as d, COUNT(DISTINCT market) as m, COUNT(DISTINCT commodity) as c, COUNT(*) as r FROM market_prices;")
        counts = cursor.fetchone()
        
        cursor.execute("SELECT date FROM market_prices ORDER BY date DESC LIMIT 1;")
        latest_row = cursor.fetchone()
        
        latest_date_str = None
        if latest_row:
            try:
                latest_date_str = datetime.strptime(latest_row["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except Exception:
                latest_date_str = latest_row["date"]
                
        return {
            "total_states": counts["s"] if counts else 0,
            "total_districts": counts["d"] if counts else 0,
            "total_markets": counts["m"] if counts else 0,
            "total_commodities": counts["c"] if counts else 0,
            "total_records": counts["r"] if counts else 0,
            "latest_date": latest_date_str
        }

def calculate_trend_info(records: list) -> dict:
    """
    Classifies the current market trend into INCREASE, DECREASE, MODERATE, or UNAVAILABLE
    strictly based on chronological real data modal prices.
    Uses a 1.5% percentage tolerance for MODERATE state.
    """
    if not records:
        return {
            "direction": "UNAVAILABLE",
            "latest_price": None,
            "previous_price": None,
            "latest_date": None,
            "previous_date": None,
            "evidence_count": 0,
            "reason": "Not enough verified historical market data to determine price movement."
        }
        
    # Standardize records sorting (latest record first)
    # arrival_date is in DD/MM/YYYY format in records returned by get_filtered_prices
    def parse_arrival_date(r):
        d_str = r.get("arrival_date")
        if not d_str:
            return 0
        try:
            parts = d_str.split("/")
            if len(parts) == 3:
                return datetime(int(parts[2]), int(parts[1]), int(parts[0])).timestamp()
        except Exception:
            pass
        return 0

    sorted_records = sorted(records, key=parse_arrival_date, reverse=True)
    
    # Deduplicate by date to get unique daily observations
    unique_observations = []
    seen_dates = set()
    for r in sorted_records:
        d = r.get("arrival_date")
        if d and d not in seen_dates:
            seen_dates.add(d)
            unique_observations.append(r)
            
    evidence_count = len(unique_observations)
    latest_rec = unique_observations[0] if evidence_count > 0 else None
    
    if evidence_count < 2:
        return {
            "direction": "UNAVAILABLE",
            "latest_price": latest_rec["modal_price"] if latest_rec else None,
            "previous_price": None,
            "latest_date": latest_rec["arrival_date"] if latest_rec else None,
            "previous_date": None,
            "evidence_count": evidence_count,
            "reason": "Not enough verified historical market data to determine price movement."
        }
        
    prev_rec = unique_observations[1]
    latest_price = latest_rec["modal_price"]
    previous_price = prev_rec["modal_price"]
    
    # Percentage-based tolerance definition (1.5%)
    tolerance = 0.015 * previous_price
    diff = latest_price - previous_price
    
    if diff > tolerance:
        direction = "INCREASE"
        reason = f"Price increased meaningfully from ₹{previous_price} to ₹{latest_price} (diff of ₹{round(diff, 2)} exceeds tolerance of ₹{round(tolerance, 2)})."
    elif diff < -tolerance:
        direction = "DECREASE"
        reason = f"Price decreased meaningfully from ₹{previous_price} to ₹{latest_price} (diff of ₹{round(diff, 2)} falls below negative tolerance of -₹{round(tolerance, 2)})."
    else:
        direction = "MODERATE"
        reason = f"Price remained stable at ₹{latest_price} (change of ₹{round(diff, 2)} is within tolerance of ±₹{round(tolerance, 2)})."
        
    return {
        "direction": direction,
        "latest_price": latest_price,
        "previous_price": previous_price,
        "latest_date": latest_rec["arrival_date"],
        "previous_date": prev_rec["arrival_date"],
        "evidence_count": evidence_count,
        "reason": reason
    }
