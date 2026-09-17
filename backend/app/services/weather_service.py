import logging
from typing import Dict, Any
from app.adapters.open_meteo import OpenMeteoAdapter

logger = logging.getLogger(__name__)

async def fetch_live_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Retrieves full weather telemetry via OpenMeteoAdapter with 10-minute caching.
    """
    return await OpenMeteoAdapter.get_weather(lat, lon)

async def fetch_weather_forecast(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Retrieves Open-Meteo current, hourly, daily, rainfall, and soil-moisture forecast data.
    """
    return await OpenMeteoAdapter.get_weather(lat, lon)
