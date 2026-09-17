import logging
from typing import Dict, Any
from app.adapters.open_meteo_flood import OpenMeteoFloodAdapter

logger = logging.getLogger(__name__)

async def fetch_flood_intelligence(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Retrieves river basin flow and flood inundation risk via OpenMeteoFloodAdapter.
    """
    return await OpenMeteoFloodAdapter.get_flood_forecast(lat, lon)
