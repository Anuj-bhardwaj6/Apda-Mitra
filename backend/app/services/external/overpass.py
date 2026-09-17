import logging
from typing import Any, Dict, List
import httpx

logger = logging.getLogger("apda_mitra.external.overpass")


class OverpassService:
    """Queries OpenStreetMap Overpass API for emergency and critical infrastructure."""

    OVERPASS_URL = "https://overpass-api.de/api/interpreter"

    @classmethod
    async def query_emergency_infrastructure(
        cls,
        lat: float,
        lon: float,
        radius_meters: int = 15000,
        amenity: str = "hospital",
    ) -> List[Dict[str, Any]]:
        query = f"""
        [out:json][timeout:15];
        (
          node["amenity"="{amenity}"](around:{radius_meters},{lat},{lon});
          way["amenity"="{amenity}"](around:{radius_meters},{lat},{lon});
        );
        out center 15;
        """

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(cls.OVERPASS_URL, data={"data": query})
                if res.status_code == 200:
                    data = res.json()
                    elements = data.get("elements", [])
                    results = []
                    for el in elements:
                        tags = el.get("tags", {})
                        el_lat = el.get("lat") or el.get("center", {}).get("lat")
                        el_lon = el.get("lon") or el.get("center", {}).get("lon")
                        if el_lat and el_lon:
                            results.append({
                                "id": f"OSM-{el.get('id')}",
                                "name": tags.get("name", f"Designated Emergency {amenity.capitalize()}"),
                                "category": amenity,
                                "latitude": el_lat,
                                "longitude": el_lon,
                                "phone": tags.get("phone") or tags.get("contact:phone"),
                                "address": tags.get("addr:street") or tags.get("addr:full", "Regional Sector"),
                            })
                    return results
        except Exception as exc:
            logger.warning("Overpass API query failed: %s", str(exc))

        return []
