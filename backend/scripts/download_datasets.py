import os
import pandas as pd
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def validate_and_save(df, path, required_cols):
    logging.info(f"Validating dataset for {path}...")
    
    # Check columns
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        logging.error(f"Missing columns {missing_cols} in {path}")
        return False
        
    # Check missing values
    missing_vals = df[required_cols].isnull().sum().sum()
    if missing_vals > 0:
        logging.warning(f"Found {missing_vals} missing values. Cleaning...")
        df = df.dropna(subset=required_cols)
        
    # Check duplicates
    dups = df.duplicated().sum()
    if dups > 0:
        logging.warning(f"Found {dups} duplicates. Cleaning...")
        df = df.drop_duplicates()
        
    num_samples = len(df)
    if num_samples == 0:
        logging.error("No valid samples left after cleaning.")
        return False
        
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    logging.info(f"Saved {num_samples} records to {path}")
    return True

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(base_dir, "..", "datasets")
    
    # Fertilizer
    fert_url = "https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data/FertilizerData.csv"
    fert_path = os.path.join(datasets_dir, "fertilizer", "fertilizer.csv")
    try:
        df_fert = pd.read_csv(fert_url)
        # Expected: Temparature,Humidity ,Moisture,Soil Type,Crop Type,Nitrogen,Potassium,Phosphorous,Fertilizer Name
        validate_and_save(df_fert, fert_path, ["Temparature", "Humidity ", "Moisture", "Nitrogen", "Potassium", "Phosphorous", "Fertilizer Name"])
    except Exception as e:
        logging.error(f"Failed to download Fertilizer dataset: {e}")

    # Soil Health
    soil_url = "https://raw.githubusercontent.com/guptahardik17/Soil-Fertility-Prediction/master/data.csv"
    soil_path = os.path.join(datasets_dir, "soil", "soil.csv")
    try:
        df_soil = pd.read_csv(soil_url)
        # Expected: pH, EC, OC, N, P, K, etc.
        validate_and_save(df_soil, soil_path, ["pH", "EC", "OC", "N", "P", "K"])
    except Exception as e:
        logging.error(f"Failed to download Soil dataset: {e}")

if __name__ == "__main__":
    main()
