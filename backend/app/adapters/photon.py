import httpx
import logging
import time
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

_search_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 86400  # 24 hours

class PhotonAdapter:
    PHOTON_URL = "https://photon.komoot.io/api"
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    HEADERS = {"User-Agent": "ApdaMitra-DisasterIntelligence/2.0 (contact@apdamitra.gov.in)"}

    @classmethod
    async def search(cls, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Fuzzy autocomplete place search for Indian locations:
        - Villages, Cities, Districts
        - Hospitals, Schools, Tourist Places, Shelters
        """
        if not query or len(query.strip()) < 2:
            return []

        q_clean = query.strip().lower()
        now = time.time()

        if q_clean in _search_cache:
            entry = _search_cache[q_clean]
            if now - entry["timestamp"] < CACHE_TTL:
                return entry["data"]

        # Step 1: Try Photon API (Fast, fuzzy, OpenStreetMap based)
        try:
            params = {
                "q": f"{query} India",
                "limit": limit,
                "lat": 20.5937,  # Center of India
                "lon": 78.9629
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(cls.PHOTON_URL, params=params)
                if res.status_code == 200:
                    data = res.json()
                    features = data.get("features", [])
                    results = []
                    for f in features:
                        props = f.get("properties", {})
                        geom = f.get("geometry", {})
                        coords = geom.get("coordinates", [0, 0])
                        
                        name = props.get("name", "")
                        city = props.get("city") or props.get("town") or props.get("village") or ""
                        district = props.get("district") or props.get("county") or ""
                        state = props.get("state", "")
                        osm_value = props.get("osm_value") or props.get("osm_key") or "location"

                        display_parts = [p for p in [name, city, district, state] if p]
                        formatted_name = ", ".join(display_parts) if display_parts else name

                        if name and len(coords) >= 2:
                            results.append({
                                "name": formatted_name,
                                "raw_name": name,
                                "latitude": float(coords[1]),
                                "longitude": float(coords[0]),
                                "type": osm_value,
                                "district": district,
                                "state": state,
                                "source": "Photon Komoot OSM"
                            })

                    if results:
                        _search_cache[q_clean] = {"data": results, "timestamp": now}
                        return results
        except Exception as e:
            logger.warning(f"Photon search API failed: {e}. Trying Nominatim fallback.")

        # Step 2: Fallback to Nominatim Search
        try:
            params = {
                "q": f"{query}, India",
                "format": "json",
                "addressdetails": 1,
                "limit": limit,
                "countrycodes": "in"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(cls.NOMINATIM_URL, params=params, headers=cls.HEADERS)
                if res.status_code == 200:
                    items = res.json()
                    results = []
                    for item in items:
                        results.append({
                            "name": item.get("display_name", ""),
                            "raw_name": item.get("name", ""),
                            "latitude": float(item.get("lat", 0.0)),
                            "longitude": float(item.get("lon", 0.0)),
                            "type": item.get("type", "place"),
                            "district": item.get("address", {}).get("state_district", ""),
                            "state": item.get("address", {}).get("state", ""),
                            "source": "OpenStreetMap Nominatim"
                        })
                    if results:
                        _search_cache[q_clean] = {"data": results, "timestamp": now}
                        return results
        except Exception as e:
            logger.error(f"Nominatim fallback search failed: {e}")

        # Curated Hotspot fallback for Indian disaster zones
        defaults = [
            {"name": "Wayanad District, Kerala", "raw_name": "Wayanad", "latitude": 11.6854, "longitude": 76.1320, "type": "district", "district": "Wayanad", "state": "Kerala", "source": "Curated Hotspots"},
            {"name": "Chooralmala Relief Camp, Wayanad, Kerala", "raw_name": "Chooralmala", "latitude": 11.7034, "longitude": 76.1540, "type": "shelter", "district": "Wayanad", "state": "Kerala", "source": "Curated Hotspots"},
            {"name": "Shimla & Kullu Valley, Himachal Pradesh", "raw_name": "Shimla", "latitude": 31.1048, "longitude": 77.1734, "type": "city", "district": "Shimla", "state": "Himachal Pradesh", "source": "Curated Hotspots"},
            {"name": "Munnar, Idukki District, Kerala", "raw_name": "Munnar", "latitude": 10.0889, "longitude": 77.0595, "type": "town", "district": "Idukki", "state": "Kerala", "source": "Curated Hotspots"},
            {"name": "Chamoli & Joshimath, Uttarakhand", "raw_name": "Chamoli", "latitude": 30.4042, "longitude": 79.3309, "type": "district", "district": "Chamoli", "state": "Uttarakhand", "source": "Curated Hotspots"},
            {"name": "Darjeeling Hill Corridor, West Bengal", "raw_name": "Darjeeling", "latitude": 27.0410, "longitude": 88.2663, "type": "city", "district": "Darjeeling", "state": "West Bengal", "source": "Curated Hotspots"},
        ]
        filtered = [d for d in defaults if q_clean in d["name"].lower() or q_clean in d["raw_name"].lower()]
        return filtered or defaults[:3]
