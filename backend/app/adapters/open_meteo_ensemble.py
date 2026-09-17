import httpx
import logging
import math
from typing import Dict, Any, List
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)

_ensemble_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 1800 # 30 minutes

class OpenMeteoEnsembleAdapter:
    """
    Adapter for Open-Meteo Ensemble API (ECMWF / DWD ICON / GFS multi-member forecast).
    Extracts multi-member forecast spread, computes mean, standard deviation,
    confidence indicators, and precipitation exceedance probabilities.
    """
    BASE_URL = settings.OPEN_METEO_ENSEMBLE_BASE_URL

    @classmethod
    async def get_ensemble_forecast(
        cls, 
        lat: float, 
        lon: float, 
        models: str = "icon_seamless"
    ) -> Dict[str, Any]:
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{models}"
        now_ts = datetime.now(timezone.utc).timestamp()

        if cache_key in _ensemble_cache:
            entry = _ensemble_cache[cache_key]
            if now_ts - entry["cached_at"] < CACHE_TTL_SECONDS:
                return entry["data"]

        try:
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": "temperature_2m,precipitation",
                "forecast_days": 3,
                "models": models,
                "timezone": "auto"
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(cls.BASE_URL, params=params)

                if res.status_code == 200:
                    payload = res.json()
                    parsed = cls._parse_ensemble_payload(payload, lat, lon, models)
                    _ensemble_cache[cache_key] = {"data": parsed, "cached_at": now_ts}
                    return parsed
                raise RuntimeError(f"Open-Meteo ensemble request returned status {res.status_code}")
        except Exception as e:
            logger.error("Open-Meteo Ensemble API error for %s,%s: %s", lat, lon, e)
            raise RuntimeError(f"Open-Meteo ensemble forecast unavailable: {e}") from e

    @classmethod
    def _parse_ensemble_payload(
        cls, 
        payload: Dict[str, Any], 
        lat: float, 
        lon: float, 
        models: str
    ) -> Dict[str, Any]:
        hourly = payload.get("hourly", {})
        times = hourly.get("time", [])

        # Group precipitation keys
        precip_keys = [k for k in hourly.keys() if "precipitation" in k]
        temp_keys = [k for k in hourly.keys() if "temperature_2m" in k]

        member_count = max(1, len(precip_keys))

        # Calculate daily aggregates for 3 forecast days (0-24h, 24-48h, 48-72h)
        daily_forecast: List[Dict[str, Any]] = []

        total_members_48h_precip: List[float] = [0.0] * member_count

        for day_idx in range(3):
            start_h = day_idx * 24
            end_h = (day_idx + 1) * 24

            if start_h >= len(times):
                break

            day_date = times[start_h].split("T")[0] if "T" in times[start_h] else times[start_h]

            # Member-wise sum of precipitation for this day
            member_daily_precips: List[float] = []
            for m_idx, k in enumerate(precip_keys):
                vals = hourly.get(k, [])[start_h:end_h]
                valid_vals = [float(v) for v in vals if v is not None]
                day_p = sum(valid_vals)
                member_daily_precips.append(day_p)
                if day_idx < 2: # next 48h
                    total_members_48h_precip[m_idx] += day_p

            # Member-wise mean temperature for this day
            member_daily_temps: List[float] = []
            for k in temp_keys:
                vals = hourly.get(k, [])[start_h:end_h]
                valid_vals = [float(v) for v in vals if v is not None]
                if valid_vals:
                    member_daily_temps.append(sum(valid_vals) / len(valid_vals))

            # Daily stats
            p_mean = sum(member_daily_precips) / len(member_daily_precips) if member_daily_precips else 0.0
            p_min = min(member_daily_precips) if member_daily_precips else 0.0
            p_max = max(member_daily_precips) if member_daily_precips else 0.0
            p_spread = p_max - p_min

            t_mean = sum(member_daily_temps) / len(member_daily_temps) if member_daily_temps else 25.0
            t_min = min(member_daily_temps) if member_daily_temps else 20.0
            t_max = max(member_daily_temps) if member_daily_temps else 28.0

            # Daily confidence score (tighter spread = higher confidence)
            # A daily spread under 10mm represents high confidence
            spread_penalty = min(60.0, p_spread * 3.5)
            day_confidence = round(max(35.0, 95.0 - spread_penalty), 1)

            daily_forecast.append({
                "date": day_date,
                "precip_mean_mm": round(p_mean, 1),
                "precip_min_mm": round(p_min, 1),
                "precip_max_mm": round(p_max, 1),
                "precip_spread_mm": round(p_spread, 1),
                "temp_mean_c": round(t_mean, 1),
                "temp_min_c": round(t_min, 1),
                "temp_max_c": round(t_max, 1),
                "confidence_pct": day_confidence
            })

        # Calculate 48h ensemble summary
        mean_48h_precip = sum(total_members_48h_precip) / len(total_members_48h_precip) if total_members_48h_precip else 0.0
        max_member_48h_precip = max(total_members_48h_precip) if total_members_48h_precip else 0.0

        # Exceedance probabilities (% members exceeding thresholds)
        exceed_10 = round((sum(1 for p in total_members_48h_precip if p >= 10.0) / member_count) * 100.0, 1)
        exceed_25 = round((sum(1 for p in total_members_48h_precip if p >= 25.0) / member_count) * 100.0, 1)
        exceed_50 = round((sum(1 for p in total_members_48h_precip if p >= 50.0) / member_count) * 100.0, 1)

        # Overall confidence and uncertainty index
        avg_confidence = sum(d["confidence_pct"] for d in daily_forecast) / len(daily_forecast) if daily_forecast else 70.0
        overall_conf = round(avg_confidence, 1)

        if overall_conf >= 75.0:
            uncertainty_level = "Low Uncertainty (High Model Agreement)"
        elif overall_conf >= 55.0:
            uncertainty_level = "Moderate Uncertainty"
        else:
            uncertainty_level = "High Uncertainty (Wide Member Spread)"

        return {
            "member_count": member_count,
            "model_name": f"DWD ICON-EPS ({models})",
            "overall_confidence_pct": overall_conf,
            "uncertainty_level": uncertainty_level,
            "mean_precipitation_next_48h_mm": round(mean_48h_precip, 1),
            "max_member_precipitation_48h_mm": round(max_member_48h_precip, 1),
            "exceedance_prob_10mm_pct": exceed_10,
            "exceedance_prob_25mm_pct": exceed_25,
            "exceedance_prob_50mm_pct": exceed_50,
            "daily_forecast": daily_forecast,
            "source": "Open-Meteo Ensemble Forecast API",
            "is_live": True
        }
