import os
import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger("market.database")

# DB path resolved relative to the backend workspace
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "market_intelligence.db")

def get_db_connection():
    """Returns a sqlite3 connection configured with Row row_factory and WAL mode."""
    conn = sqlite3.connect(DB_PATH, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def normalize_string(val: str) -> str:
    """Normalizes string to avoid mismatch on case, spaces, dashes and suffixes (e.g. 'District')."""
    if not val:
        return ""
    val = val.strip().lower()
    val = val.replace(" district", "").replace(" state", "")
    return "".join(c for c in val if c.isalnum())

def init_db():
    """Initializes the database tables and indexes."""
    os.makedirs(DB_DIR, exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Market Master Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                state TEXT NOT NULL,
                district TEXT NOT NULL,
                market TEXT NOT NULL,
                normalized_state TEXT NOT NULL,
                normalized_district TEXT NOT NULL,
                normalized_market TEXT NOT NULL,
                apmc TEXT,
                market_code TEXT,
                source TEXT NOT NULL,
                UNIQUE(normalized_state, normalized_district, normalized_market)
            );
        """)
        
        # 2. Market Prices Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,          -- Format: YYYY-MM-DD
                state TEXT NOT NULL,
                district TEXT NOT NULL,
                market TEXT NOT NULL,
                normalized_state TEXT NOT NULL,
                normalized_district TEXT NOT NULL,
                normalized_market TEXT NOT NULL,
                market_code TEXT,
                commodity TEXT NOT NULL,
                normalized_commodity TEXT NOT NULL,
                variety TEXT,
                grade TEXT,
                min_price REAL,
                max_price REAL,
                modal_price REAL,
                arrival_quantity REAL,
                unit TEXT,
                source TEXT NOT NULL,
                source_url TEXT,
                fetched_at TEXT NOT NULL,    -- ISO format
                published_at TEXT,           -- ISO format
                UNIQUE(date, normalized_market, normalized_commodity, variety, grade)
            );
        """)
        
        # Indexes for fast search
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_prices_state_district ON market_prices(normalized_state, normalized_district);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_prices_date ON market_prices(date DESC);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_prices_lookup ON market_prices(normalized_state, normalized_district, normalized_market, normalized_commodity);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_master_lookup ON market_master(normalized_state, normalized_district);")
        
        # 3. Sync Metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_metadata (
                id INTEGER PRIMARY KEY,
                last_successful_sync TEXT NOT NULL,
                status TEXT NOT NULL,
                error_message TEXT
            );
        """)
        
        cursor.execute("SELECT id FROM sync_metadata WHERE id = 1;")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO sync_metadata (id, last_successful_sync, status) VALUES (1, 'N/A', 'IDLE');")
            
        conn.commit()
        logger.info(f"Market Intelligence database initialized at {DB_PATH}")

# Auto-initialize database on import
init_db()
