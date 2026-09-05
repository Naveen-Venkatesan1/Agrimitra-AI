import os
import json
import base64
import logging
import requests
from typing import Dict, Any

LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/"
LYZR_API_KEY = os.getenv("LYZR_API_KEY", "")
LYZR_USER_ID = os.getenv("LYZR_USER_ID", "")
LYZR_AGENT_ID = os.getenv("LYZR_AGENT_ID", "")
LYZR_SESSION_ID = os.getenv("LYZR_SESSION_ID", "")

def analyze_with_lyzr(image_bytes: bytes, language: str = "English") -> Dict[str, Any]:
    """
    Sends actual uploaded crop leaf image bytes directly to the configured Lyzr Agent API for vision analysis.
    Safely extracts all naming variations across:
    - Disease: diseaseName, disease_name, disease, plant_condition, condition
    - Biological: biologicalRecommendation, biological_recommendation, biologicalTreatment, biological_treatment
    - Chemical: chemicalRecommendation, chemical_recommendation, chemicalTreatment, chemical_treatment
    - Recovery: recoveryEstimate, recovery_estimate, recoveryTimeline, recovery_timeline, cure_timeline
    """
    try:
        b64_img = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = f"""
        You are an expert Agricultural Vision AI. Analyze this uploaded crop leaf image.
        Language requested: {language}.
        
        Inspect the leaf image carefully. If the image is unclear or not a plant leaf, set "is_analyzable": false.
        
        Return ONLY valid JSON matching this exact structure:
        {{
            "is_analyzable": true,
            "cropName": "Name of crop (e.g. Tomato, Rice, Cotton)",
            "diseaseName": "Name of disease or 'Healthy Foliage'",
            "biologicalRecommendation": "Organic or bio-control composition/recommendation",
            "chemicalRecommendation": "Label-compliant chemical fungicide/pesticide recommendation with active ingredients and safety precautions",
            "recoveryEstimate": "Expected cure/recovery timeline (e.g., 10-14 days with proper treatment)"
        }}

        [IMAGE]data:image/jpeg;base64,{b64_img}[/IMAGE]
        """

        headers = {
            "Content-Type": "application/json",
            "x-api-key": LYZR_API_KEY
        }
        
        payload = {
            "user_id": LYZR_USER_ID,
            "agent_id": LYZR_AGENT_ID,
            "session_id": LYZR_SESSION_ID,
            "message": prompt
        }

        res = requests.post(LYZR_URL, headers=headers, json=payload, timeout=20)
        
        if not res.ok:
            return {
                "status": "UNVERIFIED_IMAGE",
                "error": f"Lyzr Agent HTTP {res.status_code}: Unable to reach Vision API. Please try again."
            }

        res_json = res.json()
        reply = res_json.get("response", "")
        if isinstance(reply, dict):
            reply = reply.get("response", "")

        clean_json = str(reply).strip()
        if clean_json.startswith("```json"): clean_json = clean_json[7:]
        if clean_json.startswith("```"): clean_json = clean_json[3:]
        if clean_json.endswith("```"): clean_json = clean_json[:-3]
        clean_json = clean_json.strip()

        parsed = json.loads(clean_json)

        if not parsed.get("is_analyzable", True):
            return {
                "status": "UNVERIFIED_IMAGE",
                "error": "Unable to reliably analyze uploaded image. Please upload a clearer leaf photo."
            }

        crop_name = (
            parsed.get("cropName") or 
            parsed.get("crop_name") or 
            parsed.get("crop") or 
            parsed.get("plant_name") or 
            "Crop"
        )
        
        disease_name = (
            parsed.get("diseaseName") or 
            parsed.get("disease_name") or 
            parsed.get("disease") or 
            parsed.get("plant_condition") or 
            parsed.get("condition") or 
            "Leaf Condition"
        )

        bio_rec = (
            parsed.get("biologicalRecommendation") or 
            parsed.get("biological_recommendation") or 
            parsed.get("biologicalTreatment") or 
            parsed.get("biological_treatment") or 
            "Apply bio-control spray as needed."
        )

        chem_rec = (
            parsed.get("chemicalRecommendation") or 
            parsed.get("chemical_recommendation") or 
            parsed.get("chemicalTreatment") or 
            parsed.get("chemical_treatment") or 
            "Follow CIBRC registered product label guidelines."
        )

        recovery_time = (
            parsed.get("recoveryEstimate") or 
            parsed.get("recovery_estimate") or 
            parsed.get("recoveryTimeline") or 
            parsed.get("recovery_timeline") or 
            parsed.get("cure_timeline") or 
            "10-14 days recovery period."
        )

        return {
            "status": "SUCCESS",
            "model_used": "Gemini Pro Multimodal Agent",
            "crop": crop_name,
            "crop_name": crop_name,
            "cropName": crop_name,
            "disease": disease_name,
            "disease_name": disease_name,
            "diseaseName": disease_name,
            "plant_condition": disease_name,
            "biological_recommendation": bio_rec,
            "biologicalRecommendation": bio_rec,
            "biologicalTreatment": bio_rec,
            "biological_treatment": bio_rec,
            "chemical_recommendation": chem_rec,
            "chemicalRecommendation": chem_rec,
            "chemicalTreatment": chem_rec,
            "chemical_treatment": chem_rec,
            "recovery_timeline": recovery_time,
            "recoveryEstimate": recovery_time,
            "recovery_estimate": recovery_time,
            "recoveryTimeline": recovery_time,
            "cure_timeline": recovery_time
        }

    except Exception as e:
        logging.warning(f"Vision Agent analysis error: {e}")
        return {
            "status": "UNVERIFIED_IMAGE",
            "error": f"Vision Agent analysis error: {str(e)}"
        }
