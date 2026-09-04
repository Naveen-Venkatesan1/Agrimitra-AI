from typing import Dict, Any

def normalize_crop_name(name: str) -> str:
    if not name:
        return ""
    return name.lower().strip()

def fuse_crop_identity(plantnet_result: Dict[str, Any], hf_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuses crop identification from Pl@ntNet and Hugging Face Vision providers.
    """
    p_status = plantnet_result.get("status")
    h_status = hf_result.get("status")
    
    p_crop = plantnet_result.get("crop")
    h_crop = hf_result.get("crop")
    
    # If both failed or are unavailable
    if p_status != "SUCCESS" and h_status != "SUCCESS":
        return {
            "name": "Unknown",
            "scientific_name": None,
            "verification_status": "NOT_VERIFIED",
            "confidence": 0.0,
            "error": "Both AI providers failed or are unavailable."
        }
        
    # If only PlantNet succeeded
    if p_status == "SUCCESS" and h_status != "SUCCESS":
        return {
            "name": p_crop,
            "scientific_name": plantnet_result.get("scientific_name"),
            "verification_status": "PARTIAL_VERIFICATION",
            "confidence": plantnet_result.get("confidence", 0.0),
            "error": None,
            "note": "Hugging Face Vision was unavailable."
        }
        
    # If only Hugging Face succeeded
    if h_status == "SUCCESS" and p_status != "SUCCESS":
        if normalize_crop_name(h_crop) == "unknown":
            return {
                 "name": "Unknown",
                 "scientific_name": None,
                 "verification_status": "NOT_VERIFIED",
                 "confidence": 0.0,
                 "error": None
            }
        return {
            "name": h_crop,
            "scientific_name": hf_result.get("scientific_name"),
            "verification_status": "PARTIAL_VERIFICATION",
            "confidence": 0.7 if hf_result.get("confidence") == "HIGH" else 0.4,
            "error": None,
            "note": "Pl@ntNet was unavailable."
        }
        
    # Both succeeded - check for agreement
    norm_p = normalize_crop_name(p_crop)
    norm_h = normalize_crop_name(h_crop)
    
    if norm_p in norm_h or norm_h in norm_p:
        return {
            "name": p_crop.title() if p_crop else h_crop.title(), # Prefer plantnet common name
            "scientific_name": plantnet_result.get("scientific_name") or hf_result.get("scientific_name"),
            "verification_status": "VERIFIED_AGREEMENT",
            "confidence": plantnet_result.get("confidence", 0.8),
            "error": None
        }
    else:
        return {
            "name": p_crop.title() if p_crop else h_crop.title(),
            "scientific_name": plantnet_result.get("scientific_name") or hf_result.get("scientific_name"),
            "verification_status": "MODEL_DISAGREEMENT",
            "confidence": 0.3,
            "error": "The AI sources could not confidently agree on the crop. Please upload a clearer photo."
        }
