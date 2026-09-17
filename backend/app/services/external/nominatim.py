import logging
from typing import List, Optional
import httpx
from app.core.redis import RedisCacheService
from app.schemas.gis import GeocodedLocationResponse

logger = logging.getLogger("apda_mitra.external.nominatim")

INDIAN_FALLBACK_HUBS = [
    {
        "id": "HUB-DELHI",
        "name": "Central Delhi National Control Node",
        "formatted_address": "Kashmere Gate, Old Delhi, Delhi NCT",
        "district": "Central Delhi",
        "state": "Delhi NCT",
        "latitude": 28.665,
        "longitude": 77.242,
        "category": "district",
    },
    {
        "id": "HUB-BALASORE",
        "name": "Balasore Coastal Emergency Center",
        "formatted_address": "Station Road, Balasore Town, Odisha",
        "district": "Balasore",
        "state": "Odisha",
        "latitude": 21.493,
        "longitude": 86.932,
        "category": "district",
    },
    {
        "id": "HUB-MUMBAI",
        "name": "Mumbai Suburban Mithi Monitoring Node",
        "formatted_address": "Kurla West, Mumbai Suburban, Maharashtra",
        "district": "Mumbai Suburban",
        "state": "Maharashtra",
        "latitude": 19.072,
        "longitude": 72.882,
        "category": "district",
    },
]


class NominatimService:
    """Asynchronous client for OpenStreetMap Nominatim Geocoding and Reverse Geocoding."""

    REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
    SEARCH_URL = "https://nominatim.openstreetmap.org/search"
    HEADERS = {
        "User-Agent": "ApdaMitraDisasterIntelligence/1.0 (ndma-tech@apdamitra.gov.in)",
        "Accept": "application/json",
    }

    @classmethod
    async def reverse_geocode(cls, latitude: float, longitude: float) -> GeocodedLocationResponse:
        cache_key = f"rev_geocode:{round(latitude, 3)}:{round(longitude, 3)}"
        cached = await RedisCacheService.get(cache_key)
        if cached:
            return GeocodedLocationResponse(**cached)

        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "addressdetails": 1,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(cls.REVERSE_URL, params=params, headers=cls.HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    addr = data.get("address", {})
                    district = (
                        addr.get("state_district")
                        or addr.get("district")
                        or addr.get("county")
                        or addr.get("city")
                        or "Emergency District"
                    )
                    state = addr.get("state", "India")
                    country = addr.get("country", "India")
                    postal_code = addr.get("postcode")

                    display_parts = (data.get("display_name") or "").split(",")[:3]
                    formatted = ", ".join([p.strip() for p in display_parts]) or f"{district}, {state}"

                    result = GeocodedLocationResponse(
                        id=f"NOM-{data.get('osm_id', 'REV')}",
                        name=addr.get("city") or addr.get("town") or addr.get("village") or district,
                        formatted_address=formatted,
                        district=district,
                        state=state,
                        country=country,
                        postal_code=postal_code,
                        latitude=latitude,
                        longitude=longitude,
                        category=data.get("type", "location"),
                    )

                    await RedisCacheService.set(cache_key, result.model_dump(), ttl_seconds=86400)
                    return result
        except Exception as exc:
            logger.warning("Nominatim reverse geocode failed: %s", str(exc))

        # Fallback default
        return GeocodedLocationResponse(
            id="FALLBACK-GEO",
            name="Emergency Sector",
            formatted_address=f"{latitude:.3f}°N, {longitude:.3f}°E",
            district="Coastal Sector",
            state="India",
            country="India",
            latitude=latitude,
            longitude=longitude,
            category="district",
        )

    @classmethod
    async def search(cls, query: str) -> List[GeocodedLocationResponse]:
        query_clean = query.strip()
        if not query_clean:
            return []

        cache_key = f"search_geo:{query_clean.lower()}"
        cached = await RedisCacheService.get(cache_key)
        if cached:
            return [GeocodedLocationResponse(**item) for item in cached]

        params = {
            "q": query_clean,
            "format": "json",
            "countrycodes": "in",
            "limit": 5,
            "addressdetails": 1,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(cls.SEARCH_URL, params=params, headers=cls.HEADERS)
                if res.status_code == 200:
                    data = res.json()
                    results = []
                    for item in data:
                        addr = item.get("address", {})
                        district = (
                            addr.get("state_district")
                            or addr.get("district")
                            or addr.get("county")
                            or addr.get("city")
                            or query_clean
                        )
                        state = addr.get("state", "India")
                        results.append(
                            GeocodedLocationResponse(
                                id=f"NOM-{item.get('osm_id', 'SCH')}",
                                name=item.get("name") or query_clean,
                                formatted_address=item.get("display_name", ""),
                                district=district,
                                state=state,
                                country="India",
                                postal_code=addr.get("postcode"),
                                latitude=float(item.get("lat", 0.0)),
                                longitude=float(item.get("lon", 0.0)),
                                category=item.get("type", "place"),
                            )
                        )

                    if results:
                        await RedisCacheService.set(
                            cache_key, [r.model_dump() for r in results], ttl_seconds=86400
                        )
                        return results
        except Exception as exc:
            logger.warning("Nominatim search query failed: %s", str(exc))

        # Return matching fallback hubs
        q_lower = query_clean.lower()
        matched = [
            GeocodedLocationResponse(**hub)
            for hub in INDIAN_FALLBACK_HUBS
            if q_lower in hub["name"].lower() or q_lower in hub["district"].lower()
        ]
        return matched or [GeocodedLocationResponse(**INDIAN_FALLBACK_HUBS[0])]
