import os
import json
import base64
import requests
import sqlite3
import time
import logging
import numpy as np
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import websockets
import asyncio
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="AgriMitra AI Backend Engine")

@app.on_event("startup")
async def startup_event():
    from backend.api.notifications.firebase_service import get_firebase_app, get_firestore_client
    app_ref = get_firebase_app()
    if app_ref:
        print("Firebase Admin SDK initialized successfully")
        db = get_firestore_client()
        if db:
            print("Firestore client available")

from backend.api.crop_intelligence.service import analyze_crop, chat_with_crop
from backend.api.scheduler import start_scheduler, shutdown_scheduler
from backend.api.assistant.router import router as assistant_router
from backend.api.market.router import router as market_router
from backend.api.auth.router import router as auth_router

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://agrimitra-ai-theta.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register Assistant Router
app.include_router(assistant_router)

# Register Market Intelligence Router
app.include_router(market_router)

# Register Authentication / OTP Router
app.include_router(auth_router)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Model directory with persistent volume / custom path support
MODELS_DIR = os.environ.get("MODEL_STORAGE_DIR") or os.environ.get("RAILWAY_VOLUME_MOUNT_PATH") or os.path.join(BASE_DIR, "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)
UTILS_DIR = os.path.join(BASE_DIR, "..", "utils")
DB_DIR = os.path.join(BASE_DIR, "..", "database")

# Load environment variables
env_path = os.path.join(BASE_DIR, "..", ".env")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
        import re
        pattern = re.compile(r'^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\n#]*))', re.MULTILINE)
        for match in pattern.finditer(content):
            key = match.group(1)
            val = match.group(2) or match.group(3) or match.group(4) or ""
            os.environ[key.strip()] = val.strip()
    except Exception as e:
        logging.error(f"Error loading environment variables: {e}")

# Diagnostic logging for Firebase environment keys (safe checks only)
print(f"FIREBASE_PROJECT_ID present: {'FIREBASE_PROJECT_ID' in os.environ}")
print(f"FIREBASE_CLIENT_EMAIL present: {'FIREBASE_CLIENT_EMAIL' in os.environ}")
print(f"FIREBASE_PRIVATE_KEY present: {'FIREBASE_PRIVATE_KEY' in os.environ}")

# Paths
CROP_MODEL_PATH = os.path.join(MODELS_DIR, "crop_model_v1.pkl")
CROP_ENCODER_PATH = os.path.join(MODELS_DIR, "crop_label_encoder_v1.pkl")
DISEASE_MODEL_PATH = os.path.join(MODELS_DIR, "disease_model_v1.h5")
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
    """
    Production startup:
    Crop Intelligence uses Gemini Vision API.
    No local ML models are downloaded or loaded.
    """
    global disease_kb

    try:
        # Load only the lightweight disease knowledge base if available
        if os.path.exists(DISEASE_KB_PATH):
            with open(DISEASE_KB_PATH, "r", encoding="utf-8") as f:
                disease_kb = json.load(f)

            logging.info(
                f"[CROP INTELLIGENCE] Disease Knowledge Base loaded: "
                f"{len(disease_kb)} entries"
            )

        logging.info("=" * 60)
        logging.info("AGRIMITRA AI BACKEND STARTUP")
        logging.info("Crop Intelligence: Gemini Vision API")
        logging.info("Crop Chat: Gemini API")
        logging.info("Local ML Models: DISABLED")
        logging.info("Model Downloads: DISABLED")
        logging.info("=" * 60)

        # Start background scheduler
        try:
            start_scheduler()
            logging.info("[SCHEDULER] Started successfully")
        except Exception as e:
            logging.warning(f"[SCHEDULER] Could not start: {e}")

    except Exception as e:
        logging.exception("[STARTUP] Error loading backend resources")


@app.on_event("shutdown")
async def shutdown_resources():
    try:
        shutdown_scheduler()
    except Exception as e:
        logging.warning(f"[SCHEDULER] Shutdown warning: {e}")


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

from PIL import Image, ImageStat

def validate_image_quality(filepath: str):
    """
    Validates if the image is suitable for crop disease diagnosis.
    Checks: resolution, blur (basic variance), brightness.
    Returns (True, None) if valid, (False, error_message) if invalid.
    """
    try:
        with Image.open(filepath) as img:
            # Check basic resolution
            if img.width < 50 or img.height < 50:
                return False, "Image resolution is too low. Please upload a clear close-up image."
                
            # Convert to grayscale for stat analysis
            gray = img.convert('L')
            stat = ImageStat.Stat(gray)
            
            # Brightness check (allow white background segmented leaf datasets)
            mean_brightness = stat.mean[0]
            if mean_brightness < 12:
                return False, "Image is too dark. Please capture a well-lit image."
            if mean_brightness > 252:
                return False, "Image is completely blank or overexposed. Please capture a clear leaf image."
                
            # Very basic blur check (stddev)
            stddev = stat.stddev[0]
            if stddev < 8:
                return False, "Image appears completely blank or lacks detail. Please capture a focused image of the affected leaf."
                
        return True, None
    except Exception as e:
        return False, "Invalid image format or corrupted file."

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "agrimitra-ml",
        "model_loaded": disease_model is not None
    }


@app.post("/api/crop-intelligence/analyze")
@app.post("/api/predict-disease")
async def analyze_crop_health(file: UploadFile = File(...), language: str = Form("English")):
    """
    Crop Intelligence diagnostic endpoint using real Gemini + Pl@ntNet models.
    """
    try:
        contents = await file.read()
        result = await asyncio.to_thread(analyze_crop, contents, language)
        # Wrap the new response schema to provide compatibility with older clients if they expected 'success: True'
        return {
            "success": result.get("status") != "INVALID_IMAGE",
            **result
        }
    except Exception as e:
        logging.error(f"Error in crop intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class CropChatInput(BaseModel):
    question: str
    context_payload: dict
    language: str = "English"

@app.post("/api/crop-intelligence/chat")
async def crop_intelligence_chat(data: CropChatInput):
    """Answers a farmer's voice question based on the analysis context."""
    try:
        return chat_with_crop(data.question, data.context_payload, data.language)
    except Exception as e:
        logging.error(f"Error in crop intelligence chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



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
        rec_est = diag.get("recovery_estimate", {})
        min_d = rec_est.get("minimum_days", 7)
        max_d = rec_est.get("maximum_days", 14)
        if min_d == 0 and max_d == 0:
            answer = f"Your {crop} is healthy, so no recovery timeline is necessary."
        else:
            answer = f"With timely application of {organic}, recovery for {crop} ({disease}) is estimated within {min_d} to {max_d} days under favorable conditions."
    else:
        # Do not return a static fallback answer. Let the frontend fall back to Gemini.
        answer = ""

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
    from .government_schemes_registry import get_filtered_schemes
    
    # Get schemes verified from the official sources based on filters
    verified_schemes = get_filtered_schemes(
        state=data.State,
        district=data.District,
        crop=data.Crop,
        farmer_category=data.FarmerCategory,
        scheme_type=data.SchemeType,
        search_query=data.SearchQuery
    )
    
    if not verified_schemes:
        return {"schemes": []}
        
    return {"schemes": verified_schemes}

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
