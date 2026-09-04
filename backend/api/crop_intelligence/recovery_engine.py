from typing import Dict

def get_recovery_estimate(severity: str, health_status: str) -> Dict[str, str]:
    """
    Returns a qualitative recovery estimate based on the severity and health status.
    """
    if health_status == "HEALTHY":
        return {
            "estimate": "Crop appears healthy.",
            "recheck": "Continue regular monitoring every 7-14 days.",
            "factors": []
        }
        
    severity = severity.upper()
    
    if severity == "LOW":
        return {
            "estimate": "Visible improvement may take approximately 7–14 days after appropriate treatment.",
            "recheck": "Monitor closely and re-check in 7 days.",
            "factors": ["Timely treatment", "Weather conditions"]
        }
    elif severity == "MODERATE":
        return {
            "estimate": "Improvement may take approximately 2–4 weeks. Some severely affected tissue may not recover.",
            "recheck": "Monitor closely and re-check in 7-10 days to ensure it is not spreading.",
            "factors": ["Disease progression", "Treatment efficacy", "Environmental stress"]
        }
    elif severity == "HIGH" or severity == "CRITICAL":
        return {
            "estimate": "Recovery may be limited. Heavily damaged tissue will not return to normal.",
            "recheck": "Consult a local agricultural officer immediately.",
            "factors": ["Advanced stage of infection", "Severe tissue damage"]
        }
        
    return {
        "estimate": "Recovery timeline cannot be determined confidently.",
        "recheck": "Monitor the crop over the next week for any changes.",
        "factors": []
    }
