import logging
from typing import Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel
from .service import get_live_weather

logger = logging.getLogger("weather.router")

router = APIRouter(
    prefix="/api/weather",
    tags=["Weather Intelligence"]
)

class WeatherRequest(BaseModel):
    district: Optional[str] = "Thanjavur"
    state: Optional[str] = "Tamil Nadu"
    lat: Optional[float] = None
    lon: Optional[float] = None
    crop: Optional[str] = "Paddy"
    crop_stage: Optional[str] = None

@router.get("", response_model=dict)
async def get_weather(
    district: Optional[str] = Query("Thanjavur"),
    state: Optional[str] = Query("Tamil Nadu"),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    crop: Optional[str] = Query("Paddy"),
    crop_stage: Optional[str] = Query(None)
):
    """
    Returns real-time agricultural weather and 7-day forecast.
    Supports coordinates (lat/lon) or district/state query.
    Safe, resilient, with zero frontend API key exposure.
    """
    try:
        res = get_live_weather(
            district=district or "Thanjavur",
            state=state or "Tamil Nadu",
            lat=lat,
            lon=lon,
            crop=crop,
            crop_stage=crop_stage
        )
        return {
            "success": True,
            "weather": res.get("weather"),
            "error": res.get("error")
        }
    except Exception as e:
        logger.warning(f"Error serving weather: {e}")
        from .service import get_fallback_weather
        fb = get_fallback_weather(district or "Thanjavur", state or "Tamil Nadu", crop)
        return {
            "success": True,
            "weather": fb,
            "error": None
        }

@router.post("", response_model=dict)
async def post_weather(data: WeatherRequest):
    """POST endpoint for client compatibility with JSON payload."""
    try:
        res = get_live_weather(
            district=data.district or "Thanjavur",
            state=data.state or "Tamil Nadu",
            lat=data.lat,
            lon=data.lon,
            crop=data.crop,
            crop_stage=data.crop_stage
        )
        return {
            "success": True,
            "weather": res.get("weather"),
            "error": res.get("error")
        }
    except Exception as e:
        logger.warning(f"Error serving weather via POST: {e}")
        from .service import get_fallback_weather
        fb = get_fallback_weather(data.district or "Thanjavur", data.state or "Tamil Nadu", data.crop)
        return {
            "success": True,
            "weather": fb,
            "error": None
        }
