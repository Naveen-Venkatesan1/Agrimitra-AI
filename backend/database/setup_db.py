import os
import sqlite3
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def setup_schemes_db():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "..", "datasets", "goverment schemes", "updated_data.csv")
    db_path = os.path.join(base_dir, "database", "schemes.db")
    
    if not os.path.exists(data_path):
        logging.error(f"Dataset not found at {data_path}")
        return
        
    logging.info("Loading Government Schemes dataset...")
    df = pd.read_csv(data_path, on_bad_lines='skip')
    
    # Fill NaN values with empty string
    df = df.fillna("")
    
    # Create SQLite database
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    logging.info("Creating database tables...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_name TEXT,
        slug TEXT,
        details TEXT,
        benefits TEXT,
        eligibility TEXT,
        application TEXT,
        documents TEXT,
        level TEXT,
        schemeCategory TEXT,
        tags TEXT
    )
    """)
    
    # Clear existing data
    cursor.execute("DELETE FROM schemes")
    
    logging.info("Inserting data into SQLite...")
    
    # Insert data
    for index, row in df.iterrows():
        cursor.execute("""
        INSERT INTO schemes (
            scheme_name, slug, details, benefits, eligibility, application, documents, level, schemeCategory, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(row.get('scheme_name', '')),
            str(row.get('slug', '')),
            str(row.get('details', '')),
            str(row.get('benefits', '')),
            str(row.get('eligibility', '')),
            str(row.get('application', '')),
            str(row.get('documents', '')),
            str(row.get('level', '')),
            str(row.get('schemeCategory', '')),
            str(row.get('tags', ''))
        ))
        
    conn.commit()
    conn.close()
    logging.info("Database setup complete.")

if __name__ == "__main__":
    setup_schemes_db()
