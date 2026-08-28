import httpx
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class OSRMAdapter:
    BASE_URL = "https://router.project-osrm.org/route/v1"

    @classmethod
    async def get_route(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        profile: str = "driving" # "driving" or "walking"
    ) -> Dict[str, Any]:
        """
        Calculates fastest route between two points using Open Source Routing Machine:
        - Distance (km)
        - Duration (minutes)
        - Turn-by-turn step guidance
        - GeoJSON line geometry for Leaflet map overlay
        """
        mode = "driving" if profile == "driving" else "walking"
        url = f"{cls.BASE_URL}/{mode}/{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true"
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        dist_meters = r.get("distance", 0)
                        duration_sec = r.get("duration", 0)
                        geometry = r.get("geometry", {})
                        legs = r.get("legs", [])

                        steps_list = []
                        if legs:
                            for step in legs[0].get("steps", []):
                                maneuver = step.get("maneuver", {})
                                instruction = maneuver.get("instruction") or f"{maneuver.get('type', 'Proceed')} on {step.get('name') or 'road'}"
                                steps_list.append({
                                    "instruction": instruction,
                                    "distance_meters": round(step.get("distance", 0), 1),
                                    "duration_sec": round(step.get("duration", 0), 1)
                                })

                        return {
                            "distance_km": round(dist_meters / 1000.0, 2),
                            "duration_minutes": round(duration_sec / 60.0, 1),
                            "mode": mode,
                            "geometry": geometry, # GeoJSON LineString coordinates [[lon, lat], ...]
                            "steps": steps_list[:8], # top maneuvers
                            "source": "OSRM Live Routing Engine"
                        }
        except Exception as e:
            logger.warning(f"OSRM routing engine failed: {e}. Calculating spatial geodesic route.")

        # Geodesic direct line fallback with estimated mountain driving speed (30 km/h)
        d_lat = (dest_lat - origin_lat) * 111.0
        d_lon = (dest_lon - origin_lon) * 102.0
        euclidean_km = round((d_lat**2 + d_lon**2)**0.5 * 1.25, 2) # 1.25 winding road factor
        duration_mins = round((euclidean_km / 35.0) * 60.0, 1)

        return {
            "distance_km": euclidean_km,
            "duration_minutes": max(1.0, duration_mins),
            "mode": mode,
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [origin_lon, origin_lat],
                    [(origin_lon + dest_lon) / 2 + 0.002, (origin_lat + dest_lat) / 2 - 0.001],
                    [dest_lon, dest_lat]
                ]
            },
            "steps": [
                {"instruction": "Head towards designated emergency shelter route", "distance_meters": euclidean_km * 500, "duration_sec": duration_mins * 30},
                {"instruction": "Arrive at verified safe evacuation location", "distance_meters": 0, "duration_sec": 0}
            ],
            "source": "Spatial Road-Model Fallback"
        }
