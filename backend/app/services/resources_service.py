import logging
from typing import List, Dict, Any
from app.adapters.overpass import OverpassAdapter

logger = logging.getLogger(__name__)

async def get_nearby_resources(
    lat: float,
    lon: float,
    radius_meters: int = 15000,
    facility_type: str = "all"
) -> List[Dict[str, Any]]:
    """
    Service Layer: Retrieves live shelters, hospitals, police, and fire stations from OverpassAdapter.
    """
    amenities = await OverpassAdapter.get_nearby_amenities(lat, lon, radius_meters)
    if facility_type and facility_type != "all":
        filtered = [a for a in amenities if a.get("facility_type", "").lower() == facility_type.lower()]
        return filtered or amenities
    return amenities
