import os
import requests
import logging
from typing import Dict, Any

PLANTNET_API_URL = "https://my-api.plantnet.org/v2/identify/all"

def analyze_with_plantnet(image_bytes: bytes) -> Dict[str, Any]:
    """
    Identifies the crop/plant using the real Pl@ntNet API.
    """
    api_key = os.getenv("PLANTNET_API_KEY")
    
    if not api_key:
        logging.warning("PLANTNET_API_KEY is missing. Pl@ntNet analysis unavailable.")
        return {
            "status": "PROVIDER_NOT_CONFIGURED",
            "crop": None,
            "confidence": 0.0,
            "error": "PLANTNET_API_KEY is not configured in backend."
        }

    try:
        files = [('images', ('image.jpg', image_bytes, 'image/jpeg'))]
        data = {'organs': ['auto']} # Let PlantNet auto-detect organ
        
        response = requests.post(
            f"{PLANTNET_API_URL}?api-key={api_key}",
            files=files,
            data=data,
            timeout=10
        )
        
        if response.status_code == 404:
            return {
                "status": "NOT_VERIFIED",
                "crop": None,
                "confidence": 0.0,
                "error": "Plant not found by Pl@ntNet."
            }
        
        if response.status_code == 429:
             return {
                "status": "PROVIDER_RATE_LIMITED",
                "crop": None,
                "confidence": 0.0,
                "error": "Pl@ntNet API rate limit exceeded."
            }
            
        response.raise_for_status()
        result = response.json()
        
        # Parse the top result
        results = result.get('results', [])
        if not results:
            return {
                "status": "NOT_VERIFIED",
                "crop": None,
                "confidence": 0.0,
                "error": "No results returned by Pl@ntNet."
            }
            
        top_match = results[0]
        species = top_match.get('species', {})
        score = top_match.get('score', 0.0)
        
        common_names = species.get('commonNames', [])
        scientific_name = species.get('scientificNameWithoutAuthor', 'Unknown')
        
        crop_name = common_names[0] if common_names else scientific_name
        
        return {
            "status": "SUCCESS",
            "crop": crop_name,
            "scientific_name": scientific_name,
            "confidence": score,
            "error": None
        }
        
    except requests.exceptions.Timeout:
        logging.warning("Pl@ntNet API request timed out.")
        return {
            "status": "PROVIDER_TIMEOUT",
            "crop": None,
            "confidence": 0.0,
            "error": "Pl@ntNet API request timed out."
        }
    except requests.exceptions.RequestException as e:
        logging.error(f"Pl@ntNet API error: {e}")
        return {
            "status": "PROVIDER_ERROR",
            "crop": None,
            "confidence": 0.0,
            "error": f"Pl@ntNet API error: {str(e)}"
        }
