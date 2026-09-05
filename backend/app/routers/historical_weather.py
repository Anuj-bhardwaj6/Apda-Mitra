from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import HistoricalWeatherSummary, TrustLayer
from app.services.historical_weather_service import historical_weather_service

router = APIRouter(prefix="/weather/historical", tags=["Historical Weather & AI/ML Datasets"])

@router.get("", response_model=HistoricalWeatherSummary)
@router.get("/", response_model=HistoricalWeatherSummary)
async def get_historical_weather_endpoint(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    lookback_days: int = Query(14, ge=7, le=30),
    location_name: str = Query(None)
):
    """
    Returns multi-day historical weather telemetry, rainfall accumulation trends,
    and a structured AI/ML training feature vector.
    """
    data = await historical_weather_service.get_historical_summary(
        lat=latitude,
        lon=longitude,
        lookback_days=lookback_days,
        custom_location=location_name
    )

    trust = TrustLayer(
        source=data.get("source", "Open-Meteo Historical Weather API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.97 if data.get("is_live", True) else 0.85,
        dataFreshness=f"{data.get('lookback_days', lookback_days)}-Day Historical Archive"
    )

    data["trust_layer"] = trust
    return data
