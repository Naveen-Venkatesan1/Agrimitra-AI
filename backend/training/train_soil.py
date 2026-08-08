import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
import joblib
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_soil_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "..", "datasets", "soil", "soil.csv")
    model_save_path = os.path.join(base_dir, "models", "soil_model_v1.pkl")
    label_encoder_path = os.path.join(base_dir, "models", "soil_label_encoder_v1.pkl")
    reports_dir = os.path.join(base_dir, "reports")
    report_save_path = os.path.join(reports_dir, "soil_report_v1.txt")
    
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        
    if not os.path.exists(data_path):
        logging.error(f"Dataset not found at {data_path}")
        return

    logging.info("Loading soil dataset...")
    df = pd.read_csv(data_path)
    
    features = ['pH', 'EC', 'OC', 'N', 'P', 'K']
    missing_cols = [c for c in features + ['Output'] if c not in df.columns]
    if missing_cols:
        logging.error(f"Missing columns: {missing_cols}")
        return
        
    df = df.dropna(subset=features + ['Output'])
    
    X = df[features]
    y = df['Output']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    logging.info("Training Soil Health model via Pipeline...")
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(n_estimators=100, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=[str(c) for c in le.classes_])
    
    joblib.dump(pipeline, model_save_path)
    joblib.dump(le, label_encoder_path)
    
    with open(report_save_path, "w") as f:
        f.write("Soil Health Model Evaluation Report (v1)\n")
        f.write("="*50 + "\n\n")
        f.write(f"Accuracy:  {accuracy:.4f}\n\n")
        f.write(report)
        
    logging.info(f"Soil model trained (Acc: {accuracy:.4f}). Saved to {model_save_path}")

if __name__ == "__main__":
    train_soil_model()
