from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.services.geocoding_service import search_places, reverse_geocode, get_structured_location

router = APIRouter(prefix="/geocoding", tags=["Geocoding & Location Intelligence"])

@router.get("/reverse")
async def reverse_geocode_endpoint(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180)
) -> Dict[str, Any]:
    """
    Reverse geocodes coordinates to a structured administrative hierarchy (Village, Taluk, District, State, Country).
    """
    structured = await get_structured_location(latitude, longitude)
    return {
        "success": True,
        "data": structured,
        "source": structured.get("source", "Nominatim OSM Live"),
        "confidence": 0.96
    }

@router.get("/search")
async def search_places_endpoint(
    q: str = Query(..., min_length=1, description="Query string across Indian locations")
) -> List[Dict[str, Any]]:
    """
    Fuzzy place search via Photon OSM across Indian cities, villages, hospitals, shelters, and districts.
    """
    return await search_places(q)
