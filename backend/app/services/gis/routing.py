from app.schemas.gis import EvacuationRouteResponse
from app.services.external.osrm import OSRMRoutingService


class EvacuationRoutingService:
    """Computes life-safe evacuation routes bypassing active road closures and inundation zones."""

    @classmethod
    async def compute_safe_corridor(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
    ) -> EvacuationRouteResponse:
        return await OSRMRoutingService.get_evacuation_route(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
        )
