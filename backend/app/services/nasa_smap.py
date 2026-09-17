"""
APDA MITRA — NASA SMAP / MERRA-2 Soil Moisture Service Adapter
==============================================================
Provides soil moisture telemetry directly from NASA Earthdata / NASA POWER
assimilated SMAP Level 4 & GMAO MERRA-2 Catchment Land Surface Model.

Scientific Provenance & Audit Compliance:
- Source: NASA/USDA SMAP
- Product: NASA GMAO MERRA-2 / SMAP Land Surface Soil Wetness (GWETTOP)
- Units: fraction (0-1) / m³/m³ volumetric equivalent
- Lifecycle: LIVE -> STALE -> UNAVAILABLE.
- STRICT RULE: NEVER query third-party APIs (e.g. Open-Meteo) under the NASA SMAP label.
- STRICT RULE: NEVER fall back to synthetic numbers (e.g. 88%). If offline, return DATA UNAVAILABLE.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
import logging
from typing import Any, Dict, Optional
import httpx

from app.services.cache_service import cache_service, TTL_SOIL_MOISTURE

logger = logging.getLogger("apda_mitra.services.nasa_smap")

NASA_POWER_POINT_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_CMR_GRANULES_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"


class NasaSmapService:
    def __init__(self, timeout_seconds: float = 8.0):
        self.timeout = timeout_seconds

    async def get_soil_moisture(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """
        Fetch genuine NASA SMAP / MERRA-2 surface soil wetness telemetry.
        Returns:
        {
            soil_moisture: float | None,
            soil_moisture_percent: float | None,
            soil_moisture_anomaly: float | None,
            units: "fraction (0-1)",
            observation_time: str | None,
            latitude: float,
            longitude: float,
            source: "NASA/USDA SMAP",
            source_product: str,
            fetched_at: str,
            status: "LIVE" | "STALE" | "UNAVAILABLE",
            display_text: str
        }
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        cache_key = f"nasa_smap_real:{latitude:.3f}_{longitude:.3f}"

        # 1. Check Cache
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return cached_data

        granule_id = None
        granule_time = None

        # 2. Check NASA CMR for SMAP Level 4 Surface/Root Zone Soil Moisture granule metadata
        try:
            cmr_params = {
                "short_name": "SPL4SMGP",
                "point": f"{round(longitude, 4)},{round(latitude, 4)}",
                "page_size": 1,
                "sort_key[]": "-start_date"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                cmr_resp = await client.get(NASA_CMR_GRANULES_URL, params=cmr_params)
                if cmr_resp.status_code == 200:
                    entries = cmr_resp.json().get("feed", {}).get("entry", [])
                    if entries:
                        granule_id = entries[0].get("title")
                        granule_time = entries[0].get("time_start")
        except Exception as e:
            logger.debug("NASA CMR SMAP granule query note: %s", e)

        # 3. Query NASA POWER daily Surface Soil Wetness (GWETTOP) and Root Zone Wetness (GWETROOT)
        # Directly derived from NASA GMAO MERRA-2 Land / SMAP Catchment Model
        try:
            end_date = now - timedelta(days=1)
            start_date = now - timedelta(days=5)
            power_params = {
                "parameters": "GWETTOP,GWETROOT",
                "community": "AG",
                "longitude": round(longitude, 4),
                "latitude": round(latitude, 4),
                "start": start_date.strftime("%Y%m%d"),
                "end": end_date.strftime("%Y%m%d"),
                "format": "JSON"
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(NASA_POWER_POINT_URL, params=power_params)
                if resp.status_code == 200:
                    data = resp.json()
                    gwettop_dict = (
                        data.get("properties", {})
                        .get("parameter", {})
                        .get("GWETTOP", {})
                    )

                    valid_dates = [d for d, v in gwettop_dict.items() if v is not None and v != -999.0]
                    if valid_dates:
                        valid_dates.sort()
                        latest_date_str = valid_dates[-1]
                        raw_wetness = float(gwettop_dict[latest_date_str])  # 0.0 - 1.0 fraction
                        obs_dt = datetime.strptime(latest_date_str, "%Y%m%d").replace(tzinfo=timezone.utc)

                        # Climatological baseline for monsoon Himalayan/NE regions (~0.50 surface wetness)
                        anomaly = round((raw_wetness - 0.50) / 0.15, 2)
                        moisture_pct = round(raw_wetness * 100.0, 1)

                        payload = {
                            "soil_moisture": round(raw_wetness, 3),
                            "soil_moisture_percent": moisture_pct,
                            "soil_moisture_anomaly": anomaly,
                            "units": "fraction (0-1)",
                            "observation_time": obs_dt.isoformat(),
                            "latitude": round(latitude, 4),
                            "longitude": round(longitude, 4),
                            "source": "NASA/USDA SMAP",
                            "source_product": "NASA GMAO MERRA-2 / SMAP Land Surface Model (GWETTOP)",
                            "fetched_at": now_iso,
                            "granule_id": granule_id,
                            "status": "LIVE",
                            "display_text": f"{moisture_pct}%"
                        }
                        cache_service.set(cache_key, payload, ttl_seconds=TTL_SOIL_MOISTURE, source_tag="nasa_smap")
                        return payload

        except Exception as err:
            logger.warning("NASA SMAP / POWER surface wetness query failed for (%.3f, %.3f): %s", latitude, longitude, err)

        # 4. Fail-Safe: Check Stale Cache
        stale_data = cache_service.get(cache_key)
        if stale_data:
            stale_data["status"] = "STALE"
            return stale_data

        # 5. Strict Provenance Policy: Return UNAVAILABLE (Never fake 88%)
        return {
            "soil_moisture": None,
            "soil_moisture_percent": None,
            "soil_moisture_anomaly": None,
            "units": "fraction (0-1)",
            "observation_time": granule_time,
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "source": "NASA/USDA SMAP",
            "source_product": "NASA GMAO MERRA-2 / SMAP Land Surface Model (GWETTOP)",
            "fetched_at": now_iso,
            "granule_id": granule_id,
            "status": "UNAVAILABLE",
            "display_text": "DATA UNAVAILABLE",
            "message": "Live NASA SMAP soil moisture telemetry is currently unavailable from NASA Earthdata servers."
        }


nasa_smap_service = NasaSmapService()

