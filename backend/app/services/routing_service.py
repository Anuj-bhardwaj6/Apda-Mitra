import logging
from typing import Dict, Any
from app.adapters.osrm import OSRMAdapter

logger = logging.getLogger(__name__)

async def calculate_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    profile: str = "driving"
) -> Dict[str, Any]:
    """
    Service Layer: Computes optimal navigation route using OSRMAdapter.
    Returns distance, duration, turn steps, and GeoJSON polyline.
    """
    return await OSRMAdapter.get_route(origin_lat, origin_lon, dest_lat, dest_lon, profile)
