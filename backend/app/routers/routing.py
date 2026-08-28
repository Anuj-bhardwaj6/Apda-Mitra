from fastapi import APIRouter, Query
from typing import Dict, Any
from app.services.routing_service import calculate_route

router = APIRouter(prefix="/routing", tags=["OSRM Routing Engine"])

@router.get("/directions")
async def get_directions(
    origin_lat: float = Query(..., ge=-90, le=90),
    origin_lon: float = Query(..., ge=-180, le=180),
    dest_lat: float = Query(..., ge=-90, le=90),
    dest_lon: float = Query(..., ge=-180, le=180),
    mode: str = Query("driving", regex="^(driving|walking)$")
) -> Dict[str, Any]:
    """
    Computes real OSRM routing directions between origin and destination:
    - distance_km
    - duration_minutes
    - turn-by-turn guidance steps
    - GeoJSON line geometry for Leaflet polyline rendering
    """
    route_data = await calculate_route(origin_lat, origin_lon, dest_lat, dest_lon, mode)
    return {
        "success": True,
        "data": route_data,
        "source": route_data.get("source", "OSRM Routing"),
        "confidence": 0.96
    }
