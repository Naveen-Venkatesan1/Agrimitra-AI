import os
import logging
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, ExtraTreesClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def train_crop_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    possible_paths = [
        os.path.join(base_dir, "..", "datasets", "crop_recommendation", "crop.csv"),
        os.path.join(base_dir, "..", "datasets", "crop recommedation", "crop.csv"),
        os.path.join(base_dir, "..", "datasets", "Crop_recommendation.csv"),
    ]
    
    data_path = None
    for p in possible_paths:
        if os.path.exists(p):
            data_path = p
            break
            
    if not data_path:
        logging.error("Crop Recommendation Dataset not found.")
        return

    logging.info(f"Loading crop dataset from {data_path}...")
    df = pd.read_csv(data_path)
    
    required_cols = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall', 'label']
    for col in required_cols:
        if col not in df.columns:
            logging.error(f"Missing column: {col}")
            return
            
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
    y = df['label']
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
    
    models = {
        'RandomForest': RandomForestClassifier(n_estimators=150, random_state=42),
        'GradientBoosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
        'ExtraTrees': ExtraTreesClassifier(n_estimators=150, random_state=42)
    }
    
    try:
        from xgboost import XGBClassifier
        models['XGBoost'] = XGBClassifier(n_estimators=100, random_state=42, eval_metric='mlogloss')
    except ImportError:
        pass
        
    try:
        from lightgbm import LGBMClassifier
        models['LightGBM'] = LGBMClassifier(n_estimators=100, random_state=42)
    except ImportError:
        pass
        
    best_model_name = None
    best_pipeline = None
    best_f1 = -1.0
    results = {}
    
    for name, clf in models.items():
        logging.info(f"Training {name}...")
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('model', clf)
        ])
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        rec = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        results[name] = {
            'pipeline': pipeline,
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1': f1,
            'report': classification_report(y_test, y_pred, target_names=le.classes_),
            'cm': confusion_matrix(y_test, y_pred)
        }
        logging.info(f"{name} Results -> Accuracy: {acc:.4f}, F1-Score: {f1:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = pipeline
            
    logging.info(f"Best Performing Model: {best_model_name} (F1 Score: {best_f1:.4f})")
    
    model_save_path = os.path.join(base_dir, "models", "crop_model_v1.pkl")
    encoder_save_path = os.path.join(base_dir, "models", "crop_label_encoder_v1.pkl")
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    
    joblib.dump(best_pipeline, model_save_path)
    joblib.dump(le, encoder_save_path)
    
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    report_save_path = os.path.join(reports_dir, "crop_report_v1.txt")
    
    with open(report_save_path, "w", encoding="utf-8") as f:
        f.write("AgriMitra AI - Crop Recommendation Model Benchmark & Selection Report\n")
        f.write("="*60 + "\n\n")
        for name, res in results.items():
            f.write(f"Model: {name}\n")
            f.write(f"  Accuracy:  {res['accuracy']:.4f}\n")
            f.write(f"  Precision: {res['precision']:.4f}\n")
            f.write(f"  Recall:    {res['recall']:.4f}\n")
            f.write(f"  F1-Score:  {res['f1']:.4f}\n")
            f.write("-" * 40 + "\n")
        f.write(f"\nSelected Model: {best_model_name}\n\n")
        f.write("Detailed Classification Report for Selected Model:\n")
        f.write(results[best_model_name]['report'])
        
    logging.info(f"Model saved to {model_save_path} and report saved to {report_save_path}")

if __name__ == "__main__":
    train_crop_model()
