import logging
from typing import List, Dict, Any
from app.adapters.nominatim import NominatimAdapter
from app.adapters.photon import PhotonAdapter

logger = logging.getLogger(__name__)

async def reverse_geocode(lat: float, lon: float) -> str:
    """
    Service Layer: Resolves human-readable place name via NominatimAdapter.
    """
    res = await NominatimAdapter.reverse_geocode(lat, lon)
    return res.get("formatted_name", f"{lat:.3f}°N, {lon:.3f}°E")

async def get_structured_location(lat: float, lon: float) -> Dict[str, Any]:
    """
    Service Layer: Returns detailed administrative hierarchy.
    """
    return await NominatimAdapter.reverse_geocode(lat, lon)

async def search_places(query: str) -> List[Dict[str, Any]]:
    """
    Service Layer: Performs fuzzy place search across India via PhotonAdapter.
    """
    return await PhotonAdapter.search(query)
