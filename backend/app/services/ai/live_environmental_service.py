"""
APDA MITRA — Live Environmental Prediction Service
==================================================
Connects FastAPI to the Production Environmental Data Pipeline.
Retrieves recent satellite telemetry, computes identical training features,
and executes the XGBoost model with SHAP explanations and freshness timestamps.
"""

from __future__ import annotations

import logging
from pathlib import Path
import sys
from typing import Any, Dict, Optional

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parents[4]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from ml.pipeline.environmental_pipeline import (
    EnvironmentalDataPipeline,
    EnvironmentalDataUnavailableError,
    get_environmental_pipeline,
    PIPELINE_VERSION,
    FEATURE_SCHEMA_VERSION,
)

logger = logging.getLogger("apda_mitra.services.live_environmental")


class LiveEnvironmentalService:
    """Service bridge for real-time live environmental inference."""

    def __init__(self):
        self.pipeline: EnvironmentalDataPipeline = get_environmental_pipeline()

    async def predict_live(
        self,
        latitude: float,
        longitude: float,
        target_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes real-time environmental data retrieval, feature extraction,
        and landslide risk scoring.
        """
        logger.info(
            "Live environmental hazard requested for lat=%.4f, lon=%.4f [pipeline_version=%s, schema=%s]",
            latitude,
            longitude,
            PIPELINE_VERSION,
            FEATURE_SCHEMA_VERSION,
        )
        return await self.pipeline.evaluate_location(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
        )


_service_instance: Optional[LiveEnvironmentalService] = None


def get_live_environmental_service() -> LiveEnvironmentalService:
    global _service_instance
    if _service_instance is None:
        _service_instance = LiveEnvironmentalService()
    return _service_instance
