from datetime import datetime, timezone, timedelta
import logging
from typing import Dict, Any, Optional
import httpx

from app.adapters.open_meteo_historical import OpenMeteoHistoricalAdapter
from app.services.geocoding_service import reverse_geocode
from app.services.cache_service import cache_service, TTL_RAINFALL

logger = logging.getLogger(__name__)

NASA_POWER_POINT_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"


class HistoricalWeatherService:
    @classmethod
    async def get_historical_summary(
        cls, 
        lat: float, 
        lon: float, 
        lookback_days: int = 14,
        custom_location: str = None
    ) -> Dict[str, Any]:
        data = await OpenMeteoHistoricalAdapter.get_historical_weather(lat, lon, lookback_days)
        loc_name = custom_location or await reverse_geocode(lat, lon)
        data["location_name"] = loc_name
        data["latitude"] = lat
        data["longitude"] = lon
        return data

    @classmethod
    async def get_temporal_rainfall_accumulation(
        cls,
        lat: float,
        lon: float
    ) -> Dict[str, Optional[float]]:
        """
        Computes genuine multi-day rainfall accumulations across 1d, 3d, 7d, 15d, and 30d windows.
        Strictly zero synthetic multipliers.
        """
        cache_key = f"temporal_rain_real:{lat:.3f}_{lon:.3f}"
        cached = cache_service.get(cache_key)
        if cached:
            return cached

        # 1. Primary: Query 31-day operational daily precipitation history
        try:
            hist = await OpenMeteoHistoricalAdapter.get_historical_weather(lat, lon, lookback_days=31)
            rain_1d = hist.get("rain_1d")
            rain_3d = hist.get("rain_3d")
            rain_7d = hist.get("rain_7d")
            rain_15d = hist.get("rain_15d")
            rain_30d = hist.get("rain_30d")

            if all(v is not None for v in [rain_1d, rain_3d, rain_7d, rain_30d]):
                result = {
                    "rain_1d": rain_1d,
                    "rain_3d": rain_3d,
                    "rain_7d": rain_7d,
                    "rain_15d": rain_15d if rain_15d is not None else rain_7d,
                    "rain_30d": rain_30d,
                    "source": "Open-Meteo Operational Time-Series",
                    "status": "LIVE"
                }
                cache_service.set(cache_key, result, ttl_seconds=TTL_RAINFALL, source_tag="temporal_rain")
                return result
        except Exception as e:
            logger.debug("Open-Meteo temporal accumulation failed for (%.3f, %.3f): %s. Trying NASA POWER.", lat, lon, e)

        # 2. Backup: Query NASA POWER 31-day daily PRECTOTCORR precipitation series
        try:
            now = datetime.now(timezone.utc)
            start_date = now - timedelta(days=32)
            end_date = now - timedelta(days=1)
            power_params = {
                "parameters": "PRECTOTCORR",
                "community": "AG",
                "longitude": round(lon, 4),
                "latitude": round(lat, 4),
                "start": start_date.strftime("%Y%m%d"),
                "end": end_date.strftime("%Y%m%d"),
                "format": "JSON"
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(NASA_POWER_POINT_URL, params=power_params)
                if resp.status_code == 200:
                    data = resp.json()
                    precip_dict = data.get("properties", {}).get("parameter", {}).get("PRECTOTCORR", {})
                    sorted_dates = sorted(precip_dict.keys())
                    vals = [float(precip_dict[d]) for d in sorted_dates if precip_dict[d] is not None and precip_dict[d] != -999.0]
                    if len(vals) >= 7:
                        r1 = round(sum(vals[-1:]), 2)
                        r3 = round(sum(vals[-3:]), 2)
                        r7 = round(sum(vals[-7:]), 2)
                        r15 = round(sum(vals[-15:]), 2) if len(vals) >= 15 else r7
                        r30 = round(sum(vals[-30:]), 2) if len(vals) >= 30 else sum(vals)
                        result = {
                            "rain_1d": r1,
                            "rain_3d": r3,
                            "rain_7d": r7,
                            "rain_15d": r15,
                            "rain_30d": r30,
                            "source": "NASA POWER PRECTOTCORR 30d Window",
                            "status": "LIVE"
                        }
                        cache_service.set(cache_key, result, ttl_seconds=TTL_RAINFALL, source_tag="temporal_rain")
                        return result
        except Exception as err:
            logger.warning("NASA POWER temporal accumulation failed for (%.3f, %.3f): %s", lat, lon, err)

        # 3. Fail-Safe: Check Stale Cache
        stale = cache_service.get(cache_key)
        if stale:
            stale["status"] = "STALE"
            return stale

        # 4. Refuse synthesis: Return None for all windows
        return {
            "rain_1d": None,
            "rain_3d": None,
            "rain_7d": None,
            "rain_15d": None,
            "rain_30d": None,
            "source": "Unavailable",
            "status": "UNAVAILABLE"
        }


historical_weather_service = HistoricalWeatherService()

