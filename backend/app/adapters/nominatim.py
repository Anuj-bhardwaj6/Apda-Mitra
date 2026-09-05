import httpx
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

_geocode_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 86400  # 24 hours

class NominatimAdapter:
    BASE_URL = "https://nominatim.openstreetmap.org"
    HEADERS = {"User-Agent": "ApdaMitra-DisasterIntelligence/2.0 (contact@apdamitra.gov.in)"}

    @classmethod
    async def reverse_geocode(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Reverse geocodes coordinates to a structured Indian administrative hierarchy:
        - village / town / suburb / city
        - taluk / subdistrict / tehsil
        - district
        - state
        - country
        - formatted display string
        """
        cache_key = f"{round(lat, 4)}_{round(lon, 4)}"
        now = time.time()

        if cache_key in _geocode_cache:
            entry = _geocode_cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL:
                return entry["data"]

        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "zoom": 15,
            "addressdetails": 1
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{cls.BASE_URL}/reverse", params=params, headers=cls.HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    address = data.get("address", {})

                    village = (
                        address.get("village")
                        or address.get("hamlet")
                        or address.get("suburb")
                        or address.get("neighbourhood")
                        or address.get("town")
                        or address.get("city")
                        or ""
                    )
                    taluk = address.get("county") or address.get("subdistrict") or address.get("tehsil") or ""
                    district = address.get("state_district") or address.get("district") or address.get("county") or ""
                    state = address.get("state") or ""
                    country = address.get("country") or "India"
                    postcode = address.get("postcode") or ""

                    # Human-friendly display hierarchy
                    deduped_parts = []
                    for p in [village, taluk, district, state]:
                        if p and p not in deduped_parts:
                            deduped_parts.append(p)

                    formatted = ", ".join(deduped_parts) if deduped_parts else data.get("display_name", f"{lat:.3f}°N, {lon:.3f}°E")

                    result = {
                        "formatted_name": formatted,
                        "village": village,
                        "taluk": taluk,
                        "district": district,
                        "state": state,
                        "country": country,
                        "postcode": postcode,
                        "latitude": lat,
                        "longitude": lon,
                        "source": "OpenStreetMap Nominatim Live"
                    }

                    _geocode_cache[cache_key] = {"data": result, "timestamp": now}
                    return result
        except Exception as e:
            logger.warning(f"Nominatim reverse geocode error: {e}")

        fallback = {
            "formatted_name": f"{lat:.4f}°N, {lon:.4f}°E",
            "village": "",
            "taluk": "",
            "district": f"{lat:.2f}°, {lon:.2f}°",
            "state": "",
            "country": "India",
            "postcode": "",
            "latitude": lat,
            "longitude": lon,
            "source": "Coordinates (Reverse Geocode Unavailable)"
        }
        return fallback
