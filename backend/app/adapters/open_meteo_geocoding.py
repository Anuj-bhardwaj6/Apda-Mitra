import logging
import time
from typing import Any, Dict, List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_geocoding_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 86400


class OpenMeteoGeocodingAdapter:
    BASE_URL = settings.OPEN_METEO_GEOCODING_BASE_URL

    @classmethod
    async def search(cls, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        if not query or len(query.strip()) < 2:
            return []

        q_clean = query.strip().lower()
        safe_limit = max(1, min(limit, 20))
        cache_key = f"{q_clean}_{safe_limit}"
        now = time.time()

        if cache_key in _geocoding_cache:
            entry = _geocoding_cache[cache_key]
            if now - entry["timestamp"] < CACHE_TTL_SECONDS:
                return entry["data"]

        # Query Open-Meteo with a larger count so country-filtering for India doesn't get starved
        params = {
            "name": query.strip(),
            "count": max(30, safe_limit * 3),
            "language": "en",
            "format": "json",
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(cls.BASE_URL, params=params)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.warning("Open-Meteo geocoding failed for %s: %s", query, exc)
            return []

        results: List[Dict[str, Any]] = []
        for item in payload.get("results", []):
            country_code = item.get("country_code", "")
            # Prioritize Indian locations
            if country_code and country_code.upper() != "IN":
                continue

            name = item.get("name") or ""
            admin1 = item.get("admin1") or ""
            admin2 = item.get("admin2") or ""
            admin3 = item.get("admin3") or ""
            admin4 = item.get("admin4") or ""
            country = item.get("country") or "India"
            display_parts = [p for p in [name, admin4, admin3, admin2, admin1, country] if p]
            formatted_name = ", ".join(dict.fromkeys(display_parts))

            if name and item.get("latitude") is not None and item.get("longitude") is not None:
                results.append(
                    {
                        "name": formatted_name,
                        "raw_name": name,
                        "latitude": float(item["latitude"]),
                        "longitude": float(item["longitude"]),
                        "type": item.get("feature_code") or "place",
                        "city": name,
                        "district": admin2 or admin3 or admin4 or admin1,
                        "state": admin1,
                        "country": country,
                        "timezone": item.get("timezone"),
                        "population": item.get("population"),
                        "source": "Open-Meteo Geocoding API",
                    }
                )
                if len(results) >= safe_limit:
                    break

        _geocoding_cache[cache_key] = {"data": results, "timestamp": now}
        return results