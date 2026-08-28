from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import WeatherSummary, TrustLayer
from app.services.weather_service import fetch_live_weather
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])

@router.get("/current", response_model=WeatherSummary)
async def get_current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    w = await fetch_live_weather(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)

    trust = TrustLayer(
        source="Open-Meteo Meteorological API",
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.96,
        dataFreshness="Live Stream"
    )

    return WeatherSummary(
        location_name=loc,
        temperature_c=w["temperature_c"],
        humidity_pct=w["humidity_pct"],
        rainfall_24h_mm=w["rainfall_24h_mm"],
        rainfall_72h_mm=w["rainfall_72h_mm"],
        wind_speed_kmh=w["wind_speed_kmh"],
        surface_pressure_hpa=w["surface_pressure_hpa"],
        soil_moisture_pct=w["soil_moisture_pct"],
        weather_condition=w["weather_condition"],
        trust_layer=trust
    )
