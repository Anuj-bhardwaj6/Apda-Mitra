import httpx
import logging
import math
from typing import Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_elevation_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 86400

class ElevationAdapter:
    BASE_URL = settings.OPEN_METEO_ELEVATION_BASE_URL

    @classmethod
    async def get_elevation(cls, lat: float, lon: float) -> float:
        """
        Fast direct elevation lookup in meters via Open-Meteo Elevation API.
        """
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(cls.BASE_URL, params={"latitude": lat, "longitude": lon})
                if res.status_code == 200:
                    elevs = res.json().get("elevation", [])
                    if elevs:
                        return float(elevs[0])
        except Exception as e:
            logger.warning("Open-Meteo direct elevation lookup failed for %s,%s: %s", lat, lon, e)
        return 750.0

    @classmethod
    async def get_terrain_profile(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Calculates terrain elevation, slope gradient (degrees), and aspect for spatial landslide susceptibility
        using high-accuracy Open-Meteo Elevation API sampling.
        """
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}"
        if cache_key in _elevation_cache:
            return _elevation_cache[cache_key]

        # Query central elevation and 4 surrounding points (~500m offset) to compute numerical slope
        delta = 0.005 # ~500m offset
        lats = f"{lat},{lat + delta},{lat - delta},{lat},{lat}"
        lons = f"{lon},{lon},{lon},{lon + delta},{lon - delta}"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(cls.BASE_URL, params={"latitude": lats, "longitude": lons})
                if res.status_code == 200:
                    results = res.json().get("elevation", [])
                    if len(results) >= 5:
                        elev_center = float(results[0])
                        elev_north = float(results[1])
                        elev_south = float(results[2])
                        elev_east = float(results[3])
                        elev_west = float(results[4])

                        # Compute spatial gradient (dz/dx and dz/dy)
                        dz_dx = (elev_east - elev_west) / (2 * delta * 111000 * math.cos(math.radians(lat)))
                        dz_dy = (elev_north - elev_south) / (2 * delta * 111000)

                        slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
                        slope_deg = round(math.degrees(slope_rad), 1)

                        # Aspect (compass direction of steepest slope)
                        aspect_deg = round((math.degrees(math.atan2(dz_dy, -dz_dx)) + 360) % 360, 1)

                        terrain_data = {
                            "elevation_m": round(elev_center, 1),
                            "slope_degrees": max(1.0, min(65.0, slope_deg)),
                            "aspect_degrees": aspect_deg,
                            "terrain_type": "Steep Hill Slope" if slope_deg > 25 else ("Moderate Slope" if slope_deg > 12 else "Valley / Plain"),
                            "source": "Open-Meteo Elevation API"
                        }
                        _elevation_cache[cache_key] = terrain_data
                        return terrain_data
        except Exception as e:
            logger.error("Open-Meteo Elevation API query failed for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo elevation service unavailable: {e}") from e
