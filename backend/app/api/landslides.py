"""
APDA MITRA — Dynamic NASA COOLR Landslide Incidents API
======================================================
Queries NASA COOLR ArcGIS FeatureServer dynamically.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.services.nasa_coolr import nasa_coolr_service

router = APIRouter(tags=["landslides"])


@router.get("/landslides/live")
@router.get("/landslides/coolr")
async def get_live_landslides(
    limit: int = Query(50, ge=1, le=200, description="Max records to retrieve"),
    min_lat: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    min_lon: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None)
):
    """
    Dynamic NASA COOLR Landslide Event Layer.
    Returns:
    {
      source: "NASA COOLR",
      fetched_at: str,
      events: [...]
    }
    """
    bbox = None
    if min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None:
        bbox = {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lon": min_lon,
            "max_lon": max_lon
        }

    return await nasa_coolr_service.fetch_live_events(bbox=bbox, limit=limit)
