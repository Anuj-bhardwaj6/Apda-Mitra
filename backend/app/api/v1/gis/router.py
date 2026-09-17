from typing import Any, Dict, List
from fastapi import APIRouter
from app.schemas.base import ApiResponse
from app.schemas.gis import (
    EvacuationRouteRequest,
    EvacuationRouteResponse,
    HazardPolygonResponse,
)
from app.services.gis.map_service import MapService
from app.services.gis.routing import EvacuationRoutingService

router = APIRouter(prefix="/gis", tags=["GIS & Cartographic Layers"])


@router.get(
    "/hazards",
    response_model=ApiResponse[List[HazardPolygonResponse]],
    summary="Get Active Hazard Envelopes and Inundation Polygons",
    description="Combines ISRO Bhuvan satellite flood layers and NASA LHASA landslide risk footprints.",
)
async def get_hazard_polygons() -> ApiResponse[List[HazardPolygonResponse]]:
    polygons = await MapService.get_all_hazard_polygons()
    return ApiResponse.ok(data=polygons, message="Hazard polygons loaded.")


@router.get(
    "/heatmap",
    response_model=ApiResponse[List[Dict[str, Any]]],
    summary="Get Multi-Hazard Threat Heatmap Points",
)
async def get_heatmap_points() -> ApiResponse[List[Dict[str, Any]]]:
    points = await MapService.get_risk_heatmap_points()
    return ApiResponse.ok(data=points, message="Heatmap density vectors calculated.")


@router.post(
    "/routing/evacuation",
    response_model=ApiResponse[EvacuationRouteResponse],
    summary="Calculate Life-Safe Evacuation Corridor",
    description="Computes driving corridors avoiding inundated roads and breached causeways using live OSRM.",
)
async def calculate_evacuation_corridor(
    payload: EvacuationRouteRequest,
) -> ApiResponse[EvacuationRouteResponse]:
    route_response = await EvacuationRoutingService.compute_safe_corridor(
        origin_lat=payload.origin.latitude,
        origin_lon=payload.origin.longitude,
        dest_lat=payload.destination.latitude,
        dest_lon=payload.destination.longitude,
    )
    return ApiResponse.ok(data=route_response, message="Safe evacuation route calculated.")
