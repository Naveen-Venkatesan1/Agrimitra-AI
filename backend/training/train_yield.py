import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_yield_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "..", "datasets", "crop detection", "yield_df.csv")
    model_save_path = os.path.join(base_dir, "models", "yield_model_v1.pkl")
    label_encoder_path = os.path.join(base_dir, "models", "yield_label_encoder_v1.pkl")
    reports_dir = os.path.join(base_dir, "reports")
    report_save_path = os.path.join(reports_dir, "yield_report_v1.txt")
    
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        
    if not os.path.exists(data_path):
        logging.error(f"Dataset not found at {data_path}")
        return

    logging.info("Loading crop yield dataset...")
    df = pd.read_csv(data_path)
    
    features = ['Item', 'average_rain_fall_mm_per_year', 'pesticides_tonnes', 'avg_temp']
    target = 'hg/ha_yield'
    
    missing_cols = [c for c in features + [target] if c not in df.columns]
    if missing_cols:
        logging.error(f"Missing columns: {missing_cols}")
        return
        
    df = df.dropna(subset=features + [target])
    
    # We will use 'Item' as a categorical feature, encode it
    le = LabelEncoder()
    df['Item_Encoded'] = le.fit_transform(df['Item'])
    
    X = df[['Item_Encoded', 'average_rain_fall_mm_per_year', 'pesticides_tonnes', 'avg_temp']]
    y = df[target]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    logging.info("Training Crop Yield model via Pipeline...")
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(n_estimators=50, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    
    rmse = mean_squared_error(y_test, y_pred, squared=False)
    r2 = r2_score(y_test, y_pred)
    
    joblib.dump(pipeline, model_save_path)
    joblib.dump(le, label_encoder_path)
    
    with open(report_save_path, "w") as f:
        f.write("Crop Yield Model Evaluation Report (v1)\n")
        f.write("="*50 + "\n\n")
        f.write(f"RMSE:  {rmse:.4f}\n")
        f.write(f"R2 Score: {r2:.4f}\n")
        
    logging.info(f"Yield model trained (R2: {r2:.4f}). Saved to {model_save_path}")

if __name__ == "__main__":
    train_yield_model()
