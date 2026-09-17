from fastapi import APIRouter, Query
from datetime import datetime, timezone
from app.schemas.schemas import WeatherSummary, TrustLayer
from app.services.weather_service import fetch_live_weather, fetch_weather_forecast
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])

def build_weather_summary(w: dict, loc: str, freshness: str = "Live Stream") -> WeatherSummary:
    trust = TrustLayer(
        source=w.get("source", "Open-Meteo Meteorological API"),
        updatedAt=datetime.now(timezone.utc).isoformat(),
        confidence=0.96 if w.get("is_live", True) else 0.86,
        dataFreshness=freshness
    )

    return WeatherSummary(
        location_name=loc,
        temperature_c=w["temperature_c"],
        feels_like_c=w.get("feels_like_c"),
        humidity_pct=w["humidity_pct"],
        rainfall_24h_mm=w["rainfall_24h_mm"],
        rainfall_72h_mm=w["rainfall_72h_mm"],
        rainfall_weekly_mm=w.get("rainfall_weekly_mm"),
        wind_speed_kmh=w["wind_speed_kmh"],
        wind_direction_deg=w.get("wind_direction_deg"),
        surface_pressure_hpa=w["surface_pressure_hpa"],
        soil_moisture_pct=w["soil_moisture_pct"],
        soil_moisture_surface=w.get("soil_moisture_surface"),
        soil_moisture_rootzone=w.get("soil_moisture_rootzone"),
        soil_saturation_status=w.get("soil_saturation_status"),
        rainfall_alert_tier=w.get("rainfall_alert_tier"),
        uv_index=w.get("uv_index"),
        weather_code=w.get("weather_code"),
        weather_condition=w["weather_condition"],
        hourly_forecast=w.get("hourly_forecast"),
        daily_forecast=w.get("daily_forecast"),
        source=w.get("source"),
        trust_layer=trust
    )

@router.get("/current", response_model=WeatherSummary)
async def get_current_weather(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    w = await fetch_live_weather(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)
    return build_weather_summary(w, loc)

@router.get("/forecast", response_model=WeatherSummary)
async def get_weather_forecast(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
):
    w = await fetch_weather_forecast(latitude, longitude)
    loc = await reverse_geocode(latitude, longitude)
    return build_weather_summary(w, loc, freshness="Current + 72h Forecast")
