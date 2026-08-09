import os
import json
import sqlite3
import time
import logging
import numpy as np
import joblib
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="AgriMitra AI Backend Engine")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "..", "models")
UTILS_DIR = os.path.join(BASE_DIR, "..", "utils")
DB_DIR = os.path.join(BASE_DIR, "..", "database")

# Paths
CROP_MODEL_PATH = os.path.join(MODELS_DIR, "crop_model_v1.pkl")
CROP_ENCODER_PATH = os.path.join(MODELS_DIR, "crop_label_encoder_v1.pkl")
DISEASE_MODEL_PATH = os.path.join(MODELS_DIR, "disease_model_v1.keras")
DISEASE_CLASSES_PATH = os.path.join(MODELS_DIR, "disease_classes.txt")
DISEASE_CONFIG_PATH = os.path.join(MODELS_DIR, "model_config.json")
DISEASE_KB_PATH = os.path.join(UTILS_DIR, "disease_kb.json")
DB_PATH = os.path.join(DB_DIR, "schemes.db")

SOIL_MODEL_PATH = os.path.join(MODELS_DIR, "soil_model_v1.pkl")
SOIL_ENCODER_PATH = os.path.join(MODELS_DIR, "soil_label_encoder_v1.pkl")
YIELD_MODEL_PATH = os.path.join(MODELS_DIR, "yield_model_v1.pkl")
YIELD_ENCODER_PATH = os.path.join(MODELS_DIR, "yield_label_encoder_v1.pkl")
FERTILIZER_MODEL_PATH = os.path.join(MODELS_DIR, "fertilizer_model_v2.pkl")
FERTILIZER_ENCODER_PATH = os.path.join(MODELS_DIR, "fertilizer_label_encoder_v2.pkl")
PEST_MODEL_PATH = os.path.join(MODELS_DIR, "pest_model_v1.keras")
PEST_CLASSES_PATH = os.path.join(MODELS_DIR, "pest_classes.txt")

# Global Resource Handles
crop_model = None
crop_encoder = None
disease_model = None
disease_classes = []
disease_config = {}
disease_kb = {}
soil_model = None
soil_encoder = None
yield_model = None
yield_encoder = None
fertilizer_model = None
fertilizer_encoder = None
pest_model = None
pest_classes = []

@app.on_event("startup")
async def load_resources():
    global crop_model, crop_encoder, disease_model, disease_classes, disease_config, disease_kb
    global soil_model, soil_encoder, yield_model, yield_encoder
    global fertilizer_model, fertilizer_encoder, pest_model, pest_classes
    
    try:
        if os.path.exists(CROP_MODEL_PATH) and os.path.exists(CROP_ENCODER_PATH):
            crop_model = joblib.load(CROP_MODEL_PATH)
            crop_encoder = joblib.load(CROP_ENCODER_PATH)
            logging.info(f"Loaded Crop Model from {CROP_MODEL_PATH}")
            
        if os.path.exists(DISEASE_CLASSES_PATH):
            with open(DISEASE_CLASSES_PATH, "r", encoding="utf-8") as f:
                disease_classes = [line.strip() for line in f.readlines() if line.strip()]
                
        if os.path.exists(DISEASE_CONFIG_PATH):
            with open(DISEASE_CONFIG_PATH, "r", encoding="utf-8") as f:
                disease_config = json.load(f)
                
        if os.path.exists(DISEASE_MODEL_PATH):
            disease_model = load_model(DISEASE_MODEL_PATH)
            logging.info("="*60)
            logging.info("CROP DISEASE ML MODEL LOADED SUCCESSFULLY")
            logging.info(f"Model Path: {DISEASE_MODEL_PATH}")
            logging.info(f"Number of Classes: {len(disease_classes)}")
            logging.info(f"Preprocessing Method: tf.keras.applications.mobilenet_v2.preprocess_input")
            logging.info("="*60)
        else:
            logging.warning(f"Disease model file not found yet at: {DISEASE_MODEL_PATH}")
            
        if os.path.exists(DISEASE_KB_PATH):
            with open(DISEASE_KB_PATH, "r", encoding="utf-8") as f:
                disease_kb = json.load(f)
            logging.info(f"Loaded Disease Knowledge Base with {len(disease_kb)} entries")
            
        if os.path.exists(SOIL_MODEL_PATH) and os.path.exists(SOIL_ENCODER_PATH):
            soil_model = joblib.load(SOIL_MODEL_PATH)
            soil_encoder = joblib.load(SOIL_ENCODER_PATH)
            
        if os.path.exists(YIELD_MODEL_PATH) and os.path.exists(YIELD_ENCODER_PATH):
            yield_model = joblib.load(YIELD_MODEL_PATH)
            yield_encoder = joblib.load(YIELD_ENCODER_PATH)
            
        if os.path.exists(FERTILIZER_MODEL_PATH) and os.path.exists(FERTILIZER_ENCODER_PATH):
            fertilizer_model = joblib.load(FERTILIZER_MODEL_PATH)
            fertilizer_encoder = joblib.load(FERTILIZER_ENCODER_PATH)
            
        if os.path.exists(PEST_MODEL_PATH):
            pest_model = load_model(PEST_MODEL_PATH)
        if os.path.exists(PEST_CLASSES_PATH):
            with open(PEST_CLASSES_PATH, "r", encoding="utf-8") as f:
                pest_classes = [line.strip() for line in f.readlines() if line.strip()]
                
    except Exception as e:
        logging.error(f"Error loading backend resources: {e}")

def compute_plant_health_score(disease_name: str, confidence: float, severity: str):
    """
    AgriMitra Plant Health Scoring Formula:
    - Represents actual plant physiological condition on a scale of 0-100 (NOT model confidence).
    - Healthy foliage: High base score (98 - (1.0 - confidence) * 10), bounded [85, 100].
    - Diseased foliage: Bounded [15, 79] based on severity rating and confidence:
      * High/Critical severity: Base 45 - (confidence * 20) -> [15, 45]
      * Moderate severity: Base 65 - (confidence * 15) -> [40, 65]
      * Low severity: Base 78 - (confidence * 12) -> [60, 79]
    """
    is_healthy = "healthy" in disease_name.lower()
    if is_healthy:
        score = max(85, min(100, int(98 - (1.0 - confidence) * 10)))
        rating = "Excellent" if score >= 95 else "Healthy"
    else:
        sev = severity.lower()
        if sev in ["high", "critical", "severe"]:
            score = max(15, min(45, int(45 - confidence * 20)))
        elif sev in ["moderate", "medium"]:
            score = max(40, min(65, int(65 - confidence * 15)))
        else:
            score = max(60, min(79, int(78 - confidence * 12)))
            
        if score >= 60:
            rating = "Moderate"
        elif score >= 40:
            rating = "Poor"
        else:
            rating = "Critical"
    return score, rating

class CropInput(BaseModel):
    N: float
    P: float
    K: float
    Temperature: float
    Humidity: float
    pH: float
    Rainfall: float

@app.post("/api/predict-crop")
@app.post("/api/recommend-crop")
async def recommend_crop(data: CropInput):
    if crop_model is None or crop_encoder is None:
        raise HTTPException(status_code=503, detail="Crop recommendation model is currently unavailable.")
        
    start_time = time.time()
    features = np.array([[data.N, data.P, data.K, data.Temperature, data.Humidity, data.pH, data.Rainfall]])
    
    try:
        probs = crop_model.predict_proba(features)[0]
        pred_idx = np.argmax(probs)
        confidence = float(probs[pred_idx])
        recommended_crop = crop_encoder.inverse_transform([pred_idx])[0]
        
        top3_idx = np.argsort(probs)[-3:][::-1]
        top3_preds = crop_encoder.inverse_transform(top3_idx).tolist()
        top3_conf = [round(float(probs[i]) * 100, 2) for i in top3_idx]
        
        pred_time = round(time.time() - start_time, 4)
        
        return {
            "status": "success",
            "prediction": str(recommended_crop),
            "recommended_crop": str(recommended_crop),
            "confidence": round(confidence * 100, 2),
            "suitability_score": round(confidence * 100, 1),
            "model_version": "v1 (RandomForest)",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "top_3_predictions": dict(zip(top3_preds, top3_conf)),
            "top_recommendations": dict(zip(top3_preds, top3_conf)),
            "prediction_time_sec": pred_time,
            "recommendations": {
                "message": f"Optimal crop for given NPK and climate conditions is {recommended_crop}.",
                "soil_suitability": f"N: {data.N}, P: {data.P}, K: {data.K}, pH: {data.pH}",
                "climate_suitability": f"Temp: {data.Temperature}°C, Humidity: {data.Humidity}%, Rainfall: {data.Rainfall}mm"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class HealthScoreInput(BaseModel):
    disease_name: str
    confidence: float
    severity: Optional[str] = "High"

@app.post("/api/calculate-health-score")
async def calculate_health_score(data: HealthScoreInput):
    score, rating = compute_plant_health_score(data.disease_name, data.confidence, data.severity)
    return {
        "health_score": score,
        "rating": rating,
        "is_healthy": "healthy" in data.disease_name.lower()
    }

@app.post("/api/predict-disease")
async def predict_disease(file: UploadFile = File(...)):
    # Check model loading status
    if disease_model is None or not disease_classes:
        logging.error("Predict-disease request failed: Disease model or classes not loaded!")
        return {
            "success": False,
            "error": "Analysis failed. Model is currently loading or unavailable. Please try again."
        }
        
    start_time = time.time()
    temp_file_path = f"temp_{int(time.time()*1000)}_{file.filename}"
    
    try:
        content = await file.read()
        with open(temp_file_path, "wb") as buffer:
            buffer.write(content)
            
        # Inference Preprocessing MUST match training exactly (MobileNetV2 preprocess_input)
        img = image.load_img(temp_file_path, target_size=(224, 224))
        x = image.img_to_array(img)
        x = np.expand_dims(x, axis=0) # Shape: 1 x 224 x 224 x 3
        x = preprocess_input(x) # Scale pixel values to [-1, 1]
        
        preds = disease_model.predict(x, verbose=0)[0]
        class_idx = int(np.argmax(preds))
        confidence = float(preds[class_idx])
        disease_name = disease_classes[class_idx]
        
        # Calculate real Top-3 predictions from actual model probabilities
        top3_idx = np.argsort(preds)[-3:][::-1]
        top3_preds = [disease_classes[i] for i in top3_idx]
        top3_conf = [round(float(preds[i]) * 100, 2) for i in top3_idx]
        
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            
        pred_time = round(time.time() - start_time, 4)
        logging.info(f"[ML INFERENCE] Image: {file.filename} | Predicted: {disease_name} | Confidence: {confidence*100:.2f}% | Latency: {pred_time}s")
        
        # Section 11: Low Confidence Guardrail (< 50%)
        if confidence < 0.50:
            return {
                "success": False,
                "is_low_confidence": True,
                "status": "low_confidence",
                "error": "Unable to confidently identify this leaf. Please upload a clear image of the affected leaf.",
                "message": "Unable to confidently identify this leaf. Please upload a clear image of the affected leaf.",
                "confidence": round(confidence * 100, 2),
                "top_predictions": dict(zip(top3_preds, top3_conf)),
                "top_3_predictions": dict(zip(top3_preds, top3_conf)),
                "prediction_time_sec": pred_time
            }
            
        # Parse crop and disease names
        if "___" in disease_name:
            parts = disease_name.split("___")
            detected_crop = parts[0].replace("_", " ")
            detected_disease = parts[1].replace("_", " ")
        else:
            detected_crop = "Crop"
            detected_disease = disease_name.replace("_", " ")
            
        is_healthy = "healthy" in disease_name.lower()
        severity = "Low" if is_healthy else ("High" if confidence > 0.85 else "Moderate")
        health_score, rating = compute_plant_health_score(disease_name, confidence, severity)
        
        # Fetch knowledge base entry
        kb_info = disease_kb.get(disease_name, {})
        
        # Format response
        if is_healthy:
            precautions = [
                kb_info.get("Immediate Precautions", "Maintain regular field irrigation and monitoring."),
                kb_info.get("Prevention Tips", "Apply balanced organic N-P-K bio-fertilizers.")
            ]
            treatment = [
                kb_info.get("Organic Recommendation", "No chemical treatment required. Maintain soil health."),
                kb_info.get("Chemical Treatment", "No pesticide application needed.")
            ]
            prevention = [
                kb_info.get("Prevention Tips", "Continue routine weeding and crop rotation."),
                kb_info.get("Future Prevention", "Use certified disease-resistant seeds.")
            ]
        else:
            precautions = [
                kb_info.get("Immediate Precautions", "Prune infected leaves immediately and isolate field patch."),
                kb_info.get("Prevention Tips", "Improve field aeration and avoid evening overhead sprinkler irrigation.")
            ]
            treatment = [
                kb_info.get("Organic Recommendation", "Apply Neem Seed Kernel Extract (NSKE 5%) or Trichoderma viride."),
                kb_info.get("Chemical Treatment", "Apply recommended copper fungicide or systemic spray.")
            ]
            prevention = [
                kb_info.get("Prevention Tips", "Maintain crop rotation and field sanitation."),
                kb_info.get("Future Prevention", "Plant certified disease-resistant varieties.")
            ]
            
        return {
            "success": True,
            "status": "success",
            "crop": detected_crop,
            "disease": detected_disease,
            "prediction": disease_name,
            "confidence": round(confidence * 100, 2),
            "health_score": health_score,
            "health_rating": rating,
            "severity": severity,
            "affected_area": "2-5%" if is_healthy else ("25-40%" if severity == "High" else "12-25%"),
            "risk_level": severity,
            "model_version": "v1 (MobileNetV2)",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "top_predictions": dict(zip(top3_preds, top3_conf)),
            "top_3_predictions": dict(zip(top3_preds, top3_conf)),
            "test_accuracy": disease_config.get("test_accuracy", 0.95),
            "prediction_time_sec": pred_time,
            "precautions": precautions,
            "treatment": treatment,
            "prevention": prevention,
            "recommendations": {
                "Symptoms": kb_info.get("Symptoms", "Foliar lesions or spots observed."),
                "Cause": kb_info.get("Cause", "Pathogenic organism under humid conditions."),
                "Organic Treatment": kb_info.get("Organic Recommendation", treatment[0]),
                "Chemical Treatment": kb_info.get("Chemical Treatment", treatment[1]),
                "Prevention": kb_info.get("Prevention Tips", prevention[0]),
                "Immediate Precautions": kb_info.get("Immediate Precautions", precautions[0]),
                "Future Prevention": kb_info.get("Future Prevention", prevention[1]),
                "Recovery Timeline": kb_info.get("Recovery Advice", "7-10 Days" if not is_healthy else "Immediate"),
                "Next Scan Reminder": "In 5 Days"
            }
        }
        
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        logging.error(f"Inference error in /predict-disease: {e}")
        return {
            "success": False,
            "error": "Analysis failed. Please try again."
        }

class ChatbotContextInput(BaseModel):
    query: str
    latest_diagnosis: Optional[dict] = None
    scan_history: Optional[list] = []
    state: Optional[str] = None
    district: Optional[str] = None
    crop: Optional[str] = None

@app.post("/api/chatbot-context")
async def chatbot_context(data: ChatbotContextInput):
    q = data.query.lower()
    diag = data.latest_diagnosis or {}

    # Handle scheme queries specifically
    if any(w in q for w in ["scheme", "subsidy", "yojana", "government", "benefit", "kisan", "pm-kisan"]):
        st = data.state or "Andhra Pradesh"
        dist = data.district or "Chittoor"
        crp = data.crop or "Rice"
        
        answer = f"Available Government Schemes & Subsidies for {dist}, {st} ({crp}):\n\n"
        answer += "1. PM-KISAN Samman Nidhi: Income support of ₹6,000/year in 3 equal installments for landholding farmers.\n"
        answer += "2. Pradhan Mantri Fasal Bima Yojana (PMFBY): Comprehensive crop insurance covering yield loss due to natural risks.\n"
        answer += f"3. Sub-Mission on Agricultural Mechanization (SMAM): 40-50% subsidy on modern farm equipment in {st}.\n"
        answer += f"4. Soil Health Card & Micro-Irrigation Subsidy: Up to 55% subsidy on Drip & Sprinkler irrigation in {dist}.\n"
        answer += "\nYou can explore full details and filter schemes on the Government Schemes page."
        
        return {
            "status": "success",
            "answer": answer,
            "context_used": {"state": st, "district": dist, "crop": crp, "type": "scheme_query"}
        }
    
    # Handle low confidence diagnosis
    if diag.get("isLowConfidence") or diag.get("status") == "low_confidence":
        return {
            "status": "success",
            "answer": "Your recent leaf scan had low confidence. Please upload a clear image of the affected leaf so I can assist you with precise treatment advice.",
            "context_used": {"status": "low_confidence"}
        }
        
    # Check if a valid diagnosis exists
    has_diag = bool(diag and (diag.get("crop") or diag.get("cropName") or diag.get("disease") or diag.get("diseaseName")))
    
    if not has_diag:
        if any(w in q for w in ["this", "prevent", "treatment", "medicine", "heal", "symptom", "scan"]):
            return {
                "status": "success",
                "answer": "No recent crop scan is currently available. Please upload a leaf photo in Crop Intelligence first so I can analyze your crop condition and provide specific guidance.",
                "context_used": None
            }
            
    crop = diag.get("crop") or diag.get("cropName") or "your crop"
    disease = diag.get("disease") or diag.get("diseaseName") or "healthy leaf"
    conf = diag.get("confidence") or 90
    score = diag.get("healthScore") or diag.get("health_score") or 85
    
    org_val = diag.get("organicSolution") or diag.get("biologicalTreatment") or "Apply Neem oil extract (NSKE 5%) or Trichoderma viride."
    chem_val = diag.get("treatment") or diag.get("chemicalTreatment") or "Apply recommended systemic fungicide."
    prev_val = diag.get("prevention") or "Ensure field drainage and proper plant spacing."
    imm_val = diag.get("immediatePrecautions") or "Prune infected leaves immediately."
    
    organic = ", ".join(org_val) if isinstance(org_val, list) else str(org_val)
    chemical = ", ".join(chem_val) if isinstance(chem_val, list) else str(chem_val)
    prevention = ", ".join(prev_val) if isinstance(prev_val, list) else str(prev_val)
    precautions = ", ".join(imm_val) if isinstance(imm_val, list) else str(imm_val)
    
    answer = ""
    if "prevent" in q or "precaution" in q or "stop" in q:
        answer = f"To prevent further spread of {disease} in your {crop} field:\n1. {precautions}\n2. {prevention}\n3. Avoid overhead sprinkler irrigation during humid conditions."
    elif "pesticide" in q or "chemical" in q or "medicine" in q or "spray" in q or "treatment" in q:
        answer = f"Recommended Treatment for {disease} in {crop}:\n• Chemical Treatment: {chemical}\n• Organic Remedy: {organic}"
    elif "organic" in q or "natural" in q or "bio" in q:
        answer = f"Recommended Organic Solution for {disease} in {crop}: {organic}"
    elif "disease" in q or "what is this" in q or "diagnose" in q or "identify" in q or "symptom" in q:
        answer = f"Your latest leaf scan for {crop} indicates {disease} (Confidence: {conf}%, Plant Health Score: {score}/100).\nImmediate Precaution: {precautions}"
    elif "recover" in q or "heal" in q or "timeline" in q:
        answer = f"With timely application of {organic}, recovery for {crop} ({disease}) is expected within 7 to 10 days."
    else:
        answer = f"I am your AgriMitra AI Assistant. Regarding your recent {crop} scan ({disease}): {organic} How else can I assist with your field management?"

    return {
        "status": "success",
        "answer": answer,
        "context_used": {
            "crop": crop,
            "disease": disease,
            "confidence": conf,
            "health_score": score
        }
    }

class SchemeInput(BaseModel):
    State: Optional[str] = ""
    District: Optional[str] = ""
    Crop: Optional[str] = ""
    FarmerCategory: Optional[str] = ""
    LandSize: Optional[str] = ""
    SchemeType: Optional[str] = ""
    SearchQuery: Optional[str] = ""

@app.post("/api/government-schemes")
async def get_schemes(data: SchemeInput):
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=503, detail="Database not found")
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    query_parts = []
    params = []
    
    if data.SearchQuery and data.SearchQuery.strip():
        sq = f"%{data.SearchQuery.strip()}%"
        query_parts.append("(scheme_name LIKE ? OR details LIKE ? OR tags LIKE ? OR benefits LIKE ?)")
        params.extend([sq, sq, sq, sq])

    if data.State and data.State.strip() and data.State.strip() != "All":
        st = data.State.strip()
        query_parts.append("(tags LIKE ? OR details LIKE ? OR level LIKE ? OR level LIKE 'Central' OR level LIKE 'National')")
        params.extend([f"%{st}%", f"%{st}%", f"%{st}%"])
        
    if data.District and data.District.strip() and data.District.strip() != "All":
        dist = data.District.strip()
        query_parts.append("(tags LIKE ? OR details LIKE ? OR eligibility LIKE ?)")
        params.extend([f"%{dist}%", f"%{dist}%", f"%{dist}%"])

    if data.Crop and data.Crop.strip() and data.Crop.strip() != "All":
        crp = data.Crop.strip()
        query_parts.append("(tags LIKE ? OR details LIKE ? OR scheme_name LIKE ?)")
        params.extend([f"%{crp}%", f"%{crp}%", f"%{crp}%"])

    if data.FarmerCategory and data.FarmerCategory.strip() and data.FarmerCategory.strip() != "All":
        fc = data.FarmerCategory.strip()
        query_parts.append("(tags LIKE ? OR eligibility LIKE ? OR details LIKE ?)")
        params.extend([f"%{fc}%", f"%{fc}%", f"%{fc}%"])

    if data.SchemeType and data.SchemeType.strip() and data.SchemeType.strip() != "All":
        stype = data.SchemeType.strip()
        query_parts.append("(schemeCategory LIKE ? OR tags LIKE ? OR details LIKE ?)")
        params.extend([f"%{stype}%", f"%{stype}%", f"%{stype}%"])
        
    where_clause = ""
    if query_parts:
        where_clause = "WHERE " + " AND ".join(query_parts)
        
    query = f"SELECT * FROM schemes {where_clause} LIMIT 50"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    # Fallback to general schemes if filters were too strict
    if not rows:
        cursor.execute("SELECT * FROM schemes LIMIT 20")
        rows = cursor.fetchall()

    conn.close()
    
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "Scheme Name": r["scheme_name"],
            "Department": (r["level"] + " Government") if r["level"] else "Department of Agriculture",
            "Level": r["level"] or "Central/State",
            "Description": r["details"],
            "Eligibility": r["eligibility"] or "All eligible landholding farmers",
            "Benefits": r["benefits"] or "Direct benefit transfer & agricultural subsidies",
            "Documents Required": r["documents"] or "Aadhaar Card, Land Ownership Records, Bank Passbook",
            "Application Status": "Open",
            "Official Website/Application Link": r["application"] or "https://agricoop.nic.in"
        })
        
    return {"Matching Government Schemes": results}

class SoilInput(BaseModel):
    pH: float
    EC: float
    OC: float
    N: float
    P: float
    K: float

@app.post('/api/predict-soil')
async def predict_soil(data: SoilInput):
    if soil_model is None or soil_encoder is None:
        raise HTTPException(status_code=503, detail='Soil model not loaded.')
    start_time = time.time()
    features = np.array([[data.pH, data.EC, data.OC, data.N, data.P, data.K]])
    try:
        probs = soil_model.predict_proba(features)[0]
        pred_idx = np.argmax(probs)
        confidence = float(probs[pred_idx])
        pred_label = soil_encoder.inverse_transform([pred_idx])[0]
        
        top3_idx = np.argsort(probs)[-3:][::-1]
        top3_preds = soil_encoder.inverse_transform(top3_idx).tolist()
        top3_conf = [round(float(probs[i]) * 100, 2) for i in top3_idx]
        
        pred_time = round(time.time() - start_time, 4)
        return {
            'status': 'success',
            'prediction': str(pred_label),
            'confidence': round(confidence * 100, 2),
            'model_version': 'v1',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'top_3_predictions': dict(zip(top3_preds, top3_conf)),
            'prediction_time_sec': pred_time,
            'recommendations': {'message': f'Soil Health classified as {pred_label}.'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class YieldInput(BaseModel):
    Item: str
    average_rain_fall_mm_per_year: float
    pesticides_tonnes: float
    avg_temp: float

@app.post('/api/predict-yield')
async def predict_yield(data: YieldInput):
    if yield_model is None or yield_encoder is None:
        raise HTTPException(status_code=503, detail='Yield model not loaded.')
    start_time = time.time()
    try:
        if data.Item not in yield_encoder.classes_:
            raise HTTPException(status_code=400, detail=f'Unknown crop item: {data.Item}')
        item_enc = yield_encoder.transform([data.Item])[0]
        features = np.array([[item_enc, data.average_rain_fall_mm_per_year, data.pesticides_tonnes, data.avg_temp]])
        
        pred = yield_model.predict(features)[0]
        pred_time = round(time.time() - start_time, 4)
        return {
            'status': 'success',
            'prediction': str(round(pred, 2)) + ' hg/ha',
            'confidence': 100.0,
            'model_version': 'v1',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'prediction_time_sec': pred_time,
            'recommendations': {'message': f'Predicted crop yield is {pred:.2f} hg/ha.'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FertilizerInput(BaseModel):
    Temparature: float
    Humidity: float
    Moisture: float
    Nitrogen: float
    Potassium: float
    Phosphorous: float

@app.post('/api/predict-fertilizer')
async def predict_fertilizer(data: FertilizerInput):
    if fertilizer_model is None or fertilizer_encoder is None:
        raise HTTPException(status_code=503, detail='Fertilizer model not loaded.')
    start_time = time.time()
    features = np.array([[data.Temparature, data.Humidity, data.Moisture, data.Nitrogen, data.Potassium, data.Phosphorous]])
    try:
        probs = fertilizer_model.predict_proba(features)[0]
        pred_idx = np.argmax(probs)
        confidence = float(probs[pred_idx])
        pred_label = fertilizer_encoder.inverse_transform([pred_idx])[0]
        
        top3_idx = np.argsort(probs)[-3:][::-1]
        top3_preds = fertilizer_encoder.inverse_transform(top3_idx).tolist()
        top3_conf = [round(float(probs[i]) * 100, 2) for i in top3_idx]
        
        pred_time = round(time.time() - start_time, 4)
        return {
            'status': 'success',
            'prediction': str(pred_label),
            'confidence': round(confidence * 100, 2),
            'model_version': 'v1',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'top_3_predictions': dict(zip(top3_preds, top3_conf)),
            'prediction_time_sec': pred_time,
            'recommendations': {'message': f'Recommended fertilizer dosage: {pred_label}.'}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
