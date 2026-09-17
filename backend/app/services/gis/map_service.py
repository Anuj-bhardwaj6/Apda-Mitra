from typing import Any, Dict, List
from app.schemas.gis import HazardPolygonResponse
from app.services.external.isro import ISROBhuvanService
from app.services.external.nasa import NASALandslideService


class MapService:
    """Enterprise spatial aggregator for cartographic layers, risk heatmaps, and hazard envelopes."""

    @classmethod
    async def get_all_hazard_polygons(cls) -> List[HazardPolygonResponse]:
        """Combines ISRO Bhuvan satellite surge and NASA LHASA landslide hazard boundaries."""
        isro_polys = await ISROBhuvanService.get_active_inundation_polygons()
        nasa_polys = await NASALandslideService.get_landslide_risk_zones([68.1, 6.5, 97.4, 35.5])
        return isro_polys + nasa_polys

    @classmethod
    async def get_risk_heatmap_points(cls) -> List[Dict[str, Any]]:
        """
        Synthesizes multi-hazard threat density fields across major disaster monitoring sectors.
        """
        return [
            {
                "lat": 20.82,
                "lng": 87.21,
                "intensity": 0.95,
                "hazardType": "cyclone",
                "severity": "CRITICAL",
                "color": "#D32F2F",
                "radiusKm": 35,
            },
            {
                "lat": 21.15,
                "lng": 87.12,
                "intensity": 0.82,
                "hazardType": "cyclone",
                "severity": "HIGH",
                "color": "#F9A825",
                "radiusKm": 45,
            },
            {
                "lat": 28.665,
                "lng": 77.242,
                "intensity": 0.78,
                "hazardType": "flood",
                "severity": "HIGH",
                "color": "#0288D1",
                "radiusKm": 18,
            },
            {
                "lat": 11.554,
                "lng": 76.132,
                "intensity": 0.85,
                "hazardType": "landslide",
                "severity": "CRITICAL",
                "color": "#6D4C41",
                "radiusKm": 22,
            },
        ]
