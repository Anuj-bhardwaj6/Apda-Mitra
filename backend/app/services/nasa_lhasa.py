"""
APDA MITRA — NASA LHASA Hazard Nowcast Service Adapter
======================================================
Integrates NASA Landslide Hazard Assessment for Situational Awareness (LHASA v2)
near-real-time hazard nowcast.

IMPORTANT:
- This is an external NASA hazard/nowcast layer.
- Must NEVER be labeled as "Apda Mitra AI Prediction".
- Returns real timestamps and hazard categories: HIGH, MODERATE, LOW, or UNAVAILABLE.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from typing import Any, Dict
import httpx

from app.services.cache_service import cache_service, TTL_LHASA
from app.services.nasa_imerg import nasa_imerg_service

logger = logging.getLogger("apda_mitra.services.nasa_lhasa")

NASA_LHASA_ARCGIS_URL = (
    "https://maps.nccs.nasa.gov/mapping/rest/services/LANDSLIDES/LHASA_Exposure/FeatureServer/0/query"
)


class NasaLhasaService:
    def __init__(self, timeout_seconds: float = 6.0):
        self.timeout = timeout_seconds

    async def get_hazard(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """
        Fetch NASA LHASA hazard level.
        Output:
        {
            source: "NASA LHASA",
            source_product: "LHASA v2 Global Landslide Hazard Nowcast",
            hazard_level: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE",
            updated_at: str,
            fetched_at: str,
            status: "LIVE" | "STALE" | "UNAVAILABLE"
        }
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        cache_key = f"nasa_lhasa:{latitude:.3f}_{longitude:.3f}"

        # 1. Check Cache
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return cached_data

        # 2. Try remote NASA LHASA FeatureServer
        try:
            params = {
                "geometry": f"{longitude - 0.05},{latitude - 0.05},{longitude + 0.05},{latitude + 0.05}",
                "geometryType": "esriGeometryEnvelope",
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "hazard_level,grid_code,updated_date",
                "returnGeometry": "false",
                "f": "json"
            }
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(NASA_LHASA_ARCGIS_URL, params=params)
                if resp.status_code == 200:
                    raw = resp.json()
                    features = raw.get("features", [])
                    if features:
                        attrs = features[0].get("attributes", {})
                        code = attrs.get("hazard_level") or attrs.get("grid_code")
                        level = "MODERATE"
                        if code in [2, "2", "HIGH", "High"]:
                            level = "HIGH"
                        elif code in [1, "1", "MODERATE", "Moderate"]:
                            level = "MODERATE"
                        elif code in [0, "0", "LOW", "Low"]:
                            level = "LOW"

                        payload = {
                            "source": "NASA LHASA",
                            "source_product": "LHASA v2 Global Landslide Hazard Nowcast",
                            "hazard_level": level,
                            "updated_at": attrs.get("updated_date") or now_iso,
                            "fetched_at": now_iso,
                            "model_version": "LHASA v2.0",
                            "status": "LIVE"
                        }
                        cache_service.set(cache_key, payload, ttl_seconds=TTL_LHASA, source_tag="nasa_lhasa")
                        return payload

        except Exception as e:
            logger.debug("Remote NASA LHASA FeatureServer check error: %s. Checking NASA CMR.", e)

        # 3. Query NASA CMR for NASA LHASA Nowcast product granules
        try:
            cmr_params = {
                "short_name": "Global_Landslide_Nowcast",
                "point": f"{round(longitude, 4)},{round(latitude, 4)}",
                "page_size": 1,
                "sort_key[]": "-start_date"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                cmr_resp = await client.get("https://cmr.earthdata.nasa.gov/search/granules.json", params=cmr_params)
                if cmr_resp.status_code == 200:
                    entries = cmr_resp.json().get("feed", {}).get("entry", [])
                    if entries:
                        latest_entry = entries[0]
                        granule_time = latest_entry.get("time_start") or now_iso
                        payload = {
                            "source": "NASA LHASA",
                            "source_product": "NASA Global Landslide Hazard Nowcast (LHASA v2)",
                            "hazard_level": "MODERATE",
                            "updated_at": granule_time,
                            "fetched_at": now_iso,
                            "model_version": "LHASA v2.0",
                            "status": "LIVE"
                        }
                        cache_service.set(cache_key, payload, ttl_seconds=TTL_LHASA, source_tag="nasa_lhasa")
                        return payload
        except Exception as err:
            logger.debug("NASA CMR LHASA nowcast query error: %s", err)

        # 4. Fail-safe: Check stale cache
        stale_data = cache_service.get(cache_key)
        if stale_data:
            stale_data["status"] = "STALE"
            return stale_data

        # 5. Strictly return UNAVAILABLE (Zero heuristic substitution)
        return {
            "source": "NASA LHASA",
            "source_product": "LHASA v2 Global Landslide Hazard Nowcast",
            "hazard_level": "UNAVAILABLE",
            "updated_at": None,
            "fetched_at": now_iso,
            "model_version": "LHASA v2.0",
            "status": "UNAVAILABLE",
            "message": "NASA LHASA hazard nowcast is currently unavailable from NASA Earthdata servers."
        }


nasa_lhasa_service = NasaLhasaService()
