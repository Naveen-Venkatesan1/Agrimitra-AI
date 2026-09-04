import os
import logging
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from .service import (
    get_unique_states,
    get_unique_districts,
    get_unique_markets,
    get_unique_commodities,
    get_unique_varieties,
    get_unique_grades,
    get_filtered_prices,
    get_market_summary,
    get_market_overview_stats,
    sync_market_prices,
    get_resolution_metadata,
    calculate_trend_info
)

logger = logging.getLogger("market.router")

router = APIRouter(
    prefix="/api/market",
    tags=["Market Intelligence"]
)

@router.get("", response_model=dict)
async def get_market_prices_fallback(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    commodity: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    date: Optional[str] = Query(None)
):
    """
    Main endpoint for frontend compatibility: filters cached records and returns success status and list of records.
    """
    from fastapi.params import Query as QueryParam
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    if isinstance(commodity, QueryParam): commodity = None
    if isinstance(market, QueryParam): market = None
    if isinstance(date, QueryParam): date = None

    try:
        records, _, _ = get_filtered_prices(
            state=state,
            district=district,
            market=market,
            commodity=commodity,
            date_val=date
        )
        return {
            "success": True,
            "records": records
        }
    except Exception as e:
        logger.error(f"Error fetching market prices fallback: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/states", response_model=List[str])
async def get_states():
    try:
        return get_unique_states()
    except Exception as e:
        logger.error(f"Error fetching states: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/districts", response_model=List[str])
async def get_districts(
    state: Optional[str] = Query(None, description="The state to get districts for")
):
    from fastapi.params import Query as QueryParam
    if isinstance(state, QueryParam): state = None
    try:
        return get_unique_districts(state)
    except Exception as e:
        logger.error(f"Error fetching districts for {state}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/markets", response_model=List[str])
async def get_markets(
    state: Optional[str] = Query(None, description="The state of the market"),
    district: Optional[str] = Query(None, description="The district of the market")
):
    from fastapi.params import Query as QueryParam
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    try:
        return get_unique_markets(state, district)
    except Exception as e:
        logger.error(f"Error fetching markets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/commodities", response_model=List[str])
async def get_commodities(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None)
):
    from fastapi.params import Query as QueryParam
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    if isinstance(market, QueryParam): market = None
    try:
        return get_unique_commodities(state, district, market)
    except Exception as e:
        logger.error(f"Error fetching commodities: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/varieties", response_model=List[str])
async def get_varieties(
    commodity: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None)
):
    from fastapi.params import Query as QueryParam
    if isinstance(commodity, QueryParam): commodity = None
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    if isinstance(market, QueryParam): market = None
    try:
        return get_unique_varieties(commodity, state, district, market)
    except Exception as e:
        logger.error(f"Error fetching varieties: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/grades", response_model=List[str])
async def get_grades(
    commodity: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None)
):
    from fastapi.params import Query as QueryParam
    if isinstance(commodity, QueryParam): commodity = None
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    if isinstance(market, QueryParam): market = None
    try:
        return get_unique_grades(commodity, state, district, market)
    except Exception as e:
        logger.error(f"Error fetching grades: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=dict)
async def get_stats():
    """
    Returns global, dynamic overview statistics over all mandi data.
    """
    try:
        return get_market_overview_stats()
    except Exception as e:
        logger.error(f"Error generating statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prices", response_model=dict)
async def get_prices(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    market: Optional[str] = Query(None),
    commodity: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    variety: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    from fastapi.params import Query as QueryParam
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None
    if isinstance(market, QueryParam): market = None
    if isinstance(commodity, QueryParam): commodity = None
    if isinstance(date, QueryParam): date = None
    if isinstance(variety, QueryParam): variety = None
    if isinstance(grade, QueryParam): grade = None

    try:
        # Fetch prices and date lookback metadata
        records, resolved_date, days_ago_str = get_filtered_prices(
            state=state,
            district=district,
            market=market,
            commodity=commodity,
            date_val=date,
            variety=variety,
            grade=grade
        )
        
        # Resolve layout case metadata
        layout_case = "A"
        markets_list = []
        nearby_markets = []
        last_sync = "N/A"
        
        if state and district:
            meta = get_resolution_metadata(state, district)
            layout_case = meta.get("case", "A")
            markets_list = meta.get("markets", [])
            nearby_markets = meta.get("nearby_markets", [])
            last_sync = meta.get("last_sync", "N/A")
            
        total = len(records)
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        start = (page - 1) * limit
        end = start + limit
        sliced = records[start:end]
        
        # Calculate price trend classification
        trend_info = calculate_trend_info(records)

        # Map target date format
        import datetime as dt_mod
        target_date_formatted = None
        if resolved_date:
            try:
                target_date_formatted = dt_mod.datetime.strptime(resolved_date, "%Y-%m-%d").strftime("%d %b %Y")
            except Exception:
                target_date_formatted = resolved_date

        return {
            "records": sliced,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "case": layout_case,
            "markets": markets_list,
            "nearby_markets": nearby_markets,
            "data_date": target_date_formatted,
            "days_ago": days_ago_str,
            "last_sync": last_sync,
            "trend_info": trend_info
        }
    except Exception as e:
        logger.error(f"Error filtering prices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary", response_model=dict)
async def get_summary(
    commodity: Optional[str] = Query(None, description="Commodity name for summary statistics"),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None)
):
    from fastapi.params import Query as QueryParam
    if isinstance(commodity, QueryParam): commodity = None
    if isinstance(state, QueryParam): state = None
    if isinstance(district, QueryParam): district = None

    try:
        return get_market_summary(commodity, state, district)
    except Exception as e:
        logger.error(f"Error generating summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync", response_model=dict)
async def trigger_manual_sync():
    """Triggers manual database synchronization with data.gov.in AGMARKNET dataset."""
    try:
        upsert_count = sync_market_prices()
        # Retrieve sync completion metadata
        from .database import get_db_connection
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT last_successful_sync FROM sync_metadata WHERE id = 1;")
            meta = cursor.fetchone()
            last_sync_time = meta["last_successful_sync"] if meta else "N/A"
            
        return {
            "status": "success",
            "message": "Prices updated successfully",
            "upsert_count": upsert_count,
            "timestamp": last_sync_time
        }
    except Exception as e:
        logger.error(f"Manual sync failed: {e}", exc_info=True)
        # Check database for latest data timestamp for robust fallback messaging
        from .database import get_db_connection
        last_sync_time = "N/A"
        try:
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT last_successful_sync FROM sync_metadata WHERE id = 1;")
                meta = cursor.fetchone()
                if meta:
                    last_sync_time = meta["last_successful_sync"]
        except Exception:
            pass
            
        raise HTTPException(
            status_code=503, 
            detail={
                "message": "Official price source is temporarily unavailable. Showing the latest verified data.",
                "timestamp": last_sync_time
            }
        )

@router.get("/test")
async def test_market_endpoint(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    from fastapi.params import Query as QueryParam
    if isinstance(limit, QueryParam): limit = 10
    if isinstance(offset, QueryParam): offset = 0

    try:
        from .service import get_filtered_prices
        records, _, _ = get_filtered_prices(limit=limit)
        sliced = records[offset : offset + limit]
        return {
            "status_code": 200,
            "data": sliced
        }
    except Exception as e:
        logger.error(f"Error testing market endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(e)}")
