"""
APDA MITRA — 10-State Regional Disaster Intelligence Service
============================================================
Coordinates regional telemetry, hazard nowcasts, and AI risk across the 10
authoritative target states:
Himachal Pradesh, Uttarakhand, Sikkim, Arunachal Pradesh, Assam, Meghalaya,
Nagaland, Manipur, Mizoram, and Tripura.

Guarantees:
- Zero fabricated metrics.
- No synthetic risk percentages.
- Exact source provenance.
- Clean distinction between NASA LHASA nowcasts and Apda Mitra XGBoost AI predictions.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from app.core.region_config import (
    TARGET_REGION_NAME,
    TARGET_REGION_BBOX,
    TARGET_STATES,
    get_state
)
from app.services.risk_engine import risk_engine
from app.services.nasa_lhasa import nasa_lhasa_service
from app.services.xgboost_service import xgboost_service
from app.services.cache_service import cache_service

logger = logging.getLogger("apda_mitra.services.region_service")

CACHE_KEY_REGIONAL_OVERVIEW = "regional:overview_10_states"


class RegionService:
    async def get_regional_overview(self) -> Dict[str, Any]:
        """
        Gathers regional risk overview across all 10 states.
        Calculates genuine hazard distribution counts (High, Moderate, Low, Unavailable)
        and individual state status.
        """
        cached = cache_service.get(CACHE_KEY_REGIONAL_OVERVIEW)
        if cached:
            return cached

        now_iso = datetime.now(timezone.utc).isoformat()
        state_rows: List[Dict[str, Any]] = []

        high_count = 0
        moderate_count = 0
        low_count = 0
        unavailable_count = 0

        hazard_rank = {"HIGH": 3, "MODERATE": 2, "LOW": 1, "UNAVAILABLE": 0}

        # Multi-point spatial sampling and aggregation across state boundaries
        async def fetch_state_summary(st: Dict[str, Any]) -> Dict[str, Any]:
            grid = get_state_sampling_grid(st["slug"], max_points=3)
            if not grid:
                grid = [st["centroid"]]

            sample_tasks = [nasa_lhasa_service.get_hazard(pt[0], pt[1]) for pt in grid]
            sample_results = await asyncio.gather(*sample_tasks, return_exceptions=True)

            best_rank = 0
            aggregated_hazard = "UNAVAILABLE"
            aggregated_status = "UNAVAILABLE"
            latest_time = now_iso

            for res in sample_results:
                if isinstance(res, dict):
                    hz = res.get("hazard_level", "UNAVAILABLE")
                    st_status = res.get("status", "UNAVAILABLE")
                    t = res.get("updated_at") or res.get("fetched_at")
                    if t:
                        latest_time = t
                    if st_status == "LIVE" and aggregated_status != "LIVE":
                        aggregated_status = "LIVE"
                    elif st_status == "STALE" and aggregated_status == "UNAVAILABLE":
                        aggregated_status = "STALE"

                    rk = hazard_rank.get(hz, 0)
                    if rk > best_rank:
                        best_rank = rk
                        aggregated_hazard = hz

            if aggregated_hazard == "UNAVAILABLE" and aggregated_status == "LIVE":
                aggregated_hazard = "LOW"

            ai_model_loaded = xgboost_service.is_available()
            ai_status = "AVAILABLE" if ai_model_loaded else "MODEL NOT AVAILABLE"

            return {
                "id": st["id"],
                "slug": st["slug"],
                "state": st["name"],
                "name_hi": st.get("name_hi", ""),
                "centroid": st["centroid"],
                "source": "NASA LHASA",
                "product_time": latest_time,
                "aggregation": "max_hazard_within_state_boundary",
                "hazard": aggregated_hazard,
                "data_status": aggregated_status,
                "nasa_hazard_status": aggregated_hazard,
                "ai_status": ai_status,
                "prediction_status": "INPUTS PARTIAL" if ai_model_loaded else "MODEL UNAVAILABLE",
                "last_updated": latest_time,
                "status": aggregated_status
            }

        tasks = [fetch_state_summary(st) for st in TARGET_STATES]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for idx, res in enumerate(results):
            if isinstance(res, dict):
                state_rows.append(res)
                level = res["nasa_hazard_status"]
                if level == "HIGH":
                    high_count += 1
                elif level == "MODERATE":
                    moderate_count += 1
                elif level == "LOW":
                    low_count += 1
                else:
                    unavailable_count += 1
            else:
                st = TARGET_STATES[idx]
                ai_model_loaded = xgboost_service.is_available()
                state_rows.append({
                    "id": st["id"],
                    "slug": st["slug"],
                    "state": st["name"],
                    "name_hi": st.get("name_hi", ""),
                    "centroid": st["centroid"],
                    "source": "NASA LHASA",
                    "product_time": now_iso,
                    "aggregation": "max_hazard_within_state_boundary",
                    "hazard": "UNAVAILABLE",
                    "data_status": "UNAVAILABLE",
                    "nasa_hazard_status": "UNAVAILABLE",
                    "ai_status": "AVAILABLE" if ai_model_loaded else "MODEL NOT AVAILABLE",
                    "prediction_status": "INPUTS PARTIAL" if ai_model_loaded else "MODEL UNAVAILABLE",
                    "last_updated": now_iso,
                    "status": "UNAVAILABLE"
                })
                unavailable_count += 1

        ai_risk_global_status = (
            "AVAILABLE" if xgboost_service.is_available() else "MODEL NOT AVAILABLE"
        )
        model_info = xgboost_service.get_model_status()

        overview = {
            "region": TARGET_REGION_NAME,
            "generated_at": now_iso,
            "states_monitored": len(TARGET_STATES),
            "ai_model": model_info,
            "counts": {
                "high_risk": high_count,
                "moderate_risk": moderate_count,
                "low_risk": low_count,
                "data_unavailable": unavailable_count
            },
            "ai_risk_status": ai_risk_global_status,
            "bbox": TARGET_REGION_BBOX,
            "states": state_rows
        }

        # Cache for 5 minutes
        cache_service.set(CACHE_KEY_REGIONAL_OVERVIEW, overview, ttl_seconds=300, source_tag="region_overview")
        return overview

    async def get_state_telemetry(self, state_identifier: str) -> Dict[str, Any]:
        """Unified telemetry evaluated for a state's primary centroid."""
        st = get_state(state_identifier)
        if not st:
            return {
                "status": "UNAVAILABLE",
                "message": f"State '{state_identifier}' is not in Apda Mitra's 10-state target region."
            }

        lat, lon = st["centroid"]
        telemetry = await risk_engine.get_unified_telemetry(lat, lon)
        telemetry["state"] = st["name"]
        telemetry["state_id"] = st["id"]
        telemetry["state_slug"] = st["slug"]
        return telemetry

    async def get_regional_risk(self) -> Dict[str, Any]:
        """
        Evaluates regional risk across all 10 states using canonical XGBoost model.
        Strictly returns 'model_unavailable' if model is not connected.
        Never fabricates percentages.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        if not xgboost_service.is_available():
            return {
                "region": TARGET_REGION_NAME,
                "generated_at": now_iso,
                "risk_status": "model_unavailable",
                "message": "APDA MITRA AI: MODEL NOT AVAILABLE",
                "risk_overlay_available": False,
                "states": [
                    {
                        "state": st["name"],
                        "risk_level": "MODEL NOT AVAILABLE",
                        "risk_probability": None
                    }
                    for st in TARGET_STATES
                ]
            }

        # If model is available, evaluate state centroids
        state_evals = []
        for st in TARGET_STATES:
            lat, lon = st["centroid"]
            tel = await risk_engine.get_unified_telemetry(lat, lon)
            ai = tel.get("apda_mitra_ai_prediction", {})
            state_evals.append({
                "state": st["name"],
                "risk_level": ai.get("risk_level", "MODEL NOT AVAILABLE"),
                "risk_probability": ai.get("risk_probability"),
                "risk_percentage": ai.get("risk_percentage"),
                "status": ai.get("status", "model_unavailable")
            })

        return {
            "region": TARGET_REGION_NAME,
            "generated_at": now_iso,
            "risk_status": "available",
            "risk_overlay_available": True,
            "states": state_evals
        }


region_service = RegionService()
