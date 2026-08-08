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

def train_fertilizer_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "..", "datasets", "fertilizer", "fertilizer.csv")
    model_save_path = os.path.join(base_dir, "models", "fertilizer_model_v1.pkl")
    label_encoder_path = os.path.join(base_dir, "models", "fertilizer_label_encoder_v1.pkl")
    reports_dir = os.path.join(base_dir, "reports")
    report_save_path = os.path.join(reports_dir, "fertilizer_report_v1.txt")
    
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        
    if not os.path.exists(data_path):
        logging.error(f"Dataset not found at {data_path}")
        return

    logging.info("Loading fertilizer dataset...")
    df = pd.read_csv(data_path)
    
    features = ['Temparature', 'Humidity ', 'Moisture', 'Nitrogen', 'Potassium', 'Phosphorous']
    target = 'Fertilizer Name'
    
    missing_cols = [c for c in features + [target] if c not in df.columns]
    if missing_cols:
        logging.error(f"Missing columns: {missing_cols}")
        return
        
    df = df.dropna(subset=features + [target])
    
    X = df[features]
    y = df[target]
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    logging.info("Training Fertilizer Recommendation model via Pipeline...")
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
        f.write("Fertilizer Recommendation Model Evaluation Report (v1)\n")
        f.write("="*50 + "\n\n")
        f.write(f"Accuracy:  {accuracy:.4f}\n\n")
        f.write(report)
        
    logging.info(f"Fertilizer model trained (Acc: {accuracy:.4f}). Saved to {model_save_path}")

if __name__ == "__main__":
    train_fertilizer_model()
