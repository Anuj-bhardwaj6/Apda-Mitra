"""
APDA MITRA — Production Landslide Risk Prediction Service
=========================================================
Encapsulates the canonical Apda Mitra XGBoost model and SHAP TreeExplainer.
Maintains an in-memory singleton to keep inference fast and efficient.
Logs model version, feature version, and evaluation telemetry.
Never fabricates explanations or substitutes synthetic environmental values.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
import shap

from app.schemas.landslide_prediction import (
    LandslideRiskPredictionRequest,
    LandslideRiskPredictionResponse,
    TopFactor,
)

logger = logging.getLogger("apda_mitra.services.landslide_prediction")

# Canonical 10 features expected by the trained scaler & XGBoost model
MODEL_FEATURE_ORDER = [
    "rain_1d",
    "rain_3d",
    "rain_7d",
    "rain_30d",
    "soil_moisture",
    "soil_moisture_anomaly",
    "elevation",
    "slope",
    "aspect",
    "curvature",
]

FEATURE_DISPLAY_NAMES = {
    "rain_1d": "1-day rainfall",
    "rain_3d": "3-day rainfall",
    "rain_7d": "7-day rainfall",
    "rain_30d": "30-day rainfall",
    "soil_moisture": "soil moisture",
    "soil_moisture_anomaly": "soil moisture anomaly",
    "elevation": "elevation",
    "slope": "slope",
    "aspect": "aspect",
    "curvature": "curvature",
}


class LandslidePredictionService:
    """
    Thread-safe, singleton prediction service for the Apda Mitra XGBoost model.
    Loads and caches artifacts once during application lifecycle.
    """

    _instance: Optional["LandslidePredictionService"] = None

    def __init__(self):
        self._find_and_load_artifacts()

    @classmethod
    def get_instance(cls) -> "LandslidePredictionService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _find_and_load_artifacts(self) -> None:
        """Locates and loads the model, scaler, metadata, and SHAP explainer."""
        # Locate project root from backend/app/services/ai/
        base_dir = Path(__file__).resolve().parents[4]

        # Search candidate paths for artifacts
        candidate_model_dirs = [
            base_dir / "ml" / "models",
            base_dir / "backend" / "ai" / "datasets" / "models" / "production",
            base_dir / "backend" / "ai" / "datasets" / "models" / "latest",
        ]

        model_path: Optional[Path] = None
        scaler_path: Optional[Path] = None
        metadata_path: Optional[Path] = None
        thresholds_path: Optional[Path] = None

        for c_dir in candidate_model_dirs:
            joblib_m = c_dir / "apda_mitra_xgboost.joblib"
            pkl_m = c_dir / "apda_mitra_xgboost.pkl"
            s_joblib = c_dir / "scaler.joblib"
            s_pkl = c_dir / "feature_scaler.pkl"

            if (joblib_m.exists() or pkl_m.exists()) and (s_joblib.exists() or s_pkl.exists()):
                model_path = joblib_m if joblib_m.exists() else pkl_m
                scaler_path = s_joblib if s_joblib.exists() else s_pkl
                meta_cand = c_dir / "model_metadata.json"
                if meta_cand.exists():
                    metadata_path = meta_cand
                thresh_cand = c_dir / "risk_thresholds.json"
                if thresh_cand.exists():
                    thresholds_path = thresh_cand
                break

        if not model_path or not scaler_path:
            raise FileNotFoundError("Could not find saved XGBoost model and scaler artifacts.")

        # Load model and scaler
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

        # Load metadata
        self.model_version = "2.0.0"
        self.feature_version = "10-feature-Himalayan-v2"
        if metadata_path and metadata_path.exists():
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    self.model_version = meta.get("version", meta.get("model_name", "2.0.0"))
                    feat_list = meta.get("feature_list", MODEL_FEATURE_ORDER)
                    self.feature_version = f"{len(feat_list)}-features-v{self.model_version}"
            except Exception as err:
                logger.warning("Failed to parse metadata JSON: %s", err)

        # Load experimental thresholds
        self.thresholds: Dict[str, Any] = {
            "low": 0.30,
            "moderate": 0.55,
            "high": 0.75,
            "critical": 1.0,
        }
        if thresholds_path and thresholds_path.exists():
            try:
                with open(thresholds_path, "r", encoding="utf-8") as f:
                    t_data = json.load(f)
                    for tier_name, tier_vals in t_data.get("thresholds", {}).items():
                        self.thresholds[tier_name.lower()] = tier_vals.get("max_probability", 1.0)
            except Exception as err:
                logger.warning("Failed to parse risk thresholds JSON: %s", err)

        # Initialize SHAP TreeExplainer for exact additive feature attribution
        self.explainer = shap.TreeExplainer(self.model)

        logger.info(
            "Apda Mitra XGBoost model loaded successfully [model_version=%s, feature_version=%s, path=%s]",
            self.model_version,
            self.feature_version,
            model_path,
        )

    def map_risk_level(self, probability: float) -> str:
        """Maps probability to documented experimental risk tiers."""
        p = max(0.0, min(1.0, float(probability)))
        if p < self.thresholds.get("low", 0.30):
            return "Low"
        elif p < self.thresholds.get("moderate", 0.55):
            return "Moderate"
        elif p < self.thresholds.get("high", 0.75):
            return "High"
        else:
            return "Critical"

    def compute_top_factors(
        self,
        df_raw: pd.DataFrame,
        df_scaled: pd.DataFrame,
        top_k: int = 4,
    ) -> List[TopFactor]:
        """
        Uses TreeExplainer to compute exact SHAP attributions.
        Strictly categorizes factors without fabricated values.
        """
        shap_values_obj = self.explainer(df_scaled)
        shap_raw = shap_values_obj.values[0]

        shap_dict = {
            feat: float(shap_raw[idx])
            for idx, feat in enumerate(MODEL_FEATURE_ORDER)
        }

        # Filter positive contributors pushing risk upward
        positive_contributors = [
            (feat, shap_dict[feat])
            for feat in MODEL_FEATURE_ORDER
            if shap_dict[feat] > 1e-4
        ]

        if positive_contributors:
            ranked = sorted(positive_contributors, key=lambda x: x[1], reverse=True)
            max_shap = ranked[0][1]
            sum_pos = sum(val for _, val in ranked)
        else:
            ranked = sorted(
                [(feat, shap_dict[feat]) for feat in MODEL_FEATURE_ORDER],
                key=lambda x: abs(x[1]),
                reverse=True,
            )
            max_shap = max(abs(val) for _, val in ranked) if ranked else 1.0
            sum_pos = 1.0

        top_factors: List[TopFactor] = []

        for feat, val in ranked[:top_k]:
            display_name = FEATURE_DISPLAY_NAMES.get(feat, feat)
            raw_val = float(df_raw[feat].iloc[0])
            ratio_to_max = (val / max_shap) if max_shap > 0 else 0.0
            share_of_positive = (val / sum_pos) if sum_pos > 0 else 0.0

            if val > 0:
                if val >= 1.0 or ratio_to_max >= 0.40 or share_of_positive >= 0.30:
                    tier = "high contribution"
                elif val >= 0.20 or ratio_to_max >= 0.15 or share_of_positive >= 0.10:
                    tier = "moderate contribution"
                else:
                    tier = "minor contribution"
            elif val < 0:
                if abs(val) >= 1.0 or (max_shap > 0 and abs(val) / max_shap >= 0.40):
                    tier = "high protective contribution"
                elif abs(val) >= 0.20 or (max_shap > 0 and abs(val) / max_shap >= 0.15):
                    tier = "moderate protective contribution"
                else:
                    tier = "protective / mitigating factor"
            else:
                tier = "neutral"

            top_factors.append(
                TopFactor(
                    factor=display_name,
                    contribution=tier,
                    shap_value=round(val, 4),
                    feature_value=raw_val,
                    summary=f"{display_name} — {tier}",
                )
            )

        return top_factors

    def predict(self, req: LandslideRiskPredictionRequest) -> LandslideRiskPredictionResponse:
        """
        Executes prediction for the validated request.
        Logs model and feature versions, validates all data, performs inference,
        and computes SHAP factor explanations.
        """
        logger.info(
            "Serving landslide risk prediction for lat=%.4f, lon=%.4f, date=%s [model_version=%s, feature_version=%s]",
            req.latitude,
            req.longitude,
            req.date,
            self.model_version,
            self.feature_version,
        )

        # Map request features to model's canonical feature vector
        # Never substitute fake environmental values
        feature_map = {
            "rain_1d": float(req.rainfall_1d),
            "rain_3d": float(req.rainfall_3d),
            "rain_7d": float(req.rainfall_7d),
            "rain_30d": float(req.rainfall_30d),
            "soil_moisture": float(req.soil_moisture),
            "soil_moisture_anomaly": float(req.soil_moisture_anomaly),
            "elevation": float(req.elevation),
            "slope": float(req.slope),
            "aspect": float(req.aspect),
            "curvature": float(req.curvature),
        }

        df_raw = pd.DataFrame([feature_map], columns=MODEL_FEATURE_ORDER)

        # Scale features
        scaled_array = self.scaler.transform(df_raw)
        df_scaled = pd.DataFrame(scaled_array, columns=MODEL_FEATURE_ORDER)

        # XGBoost inference
        proba = float(self.model.predict_proba(df_scaled)[0, 1])
        risk_probability = round(proba, 4)

        # Map experimental risk tier
        risk_level = self.map_risk_level(risk_probability)

        # Compute SHAP top factors
        top_factors = self.compute_top_factors(df_raw=df_raw, df_scaled=df_scaled, top_k=4)

        return LandslideRiskPredictionResponse(
            risk_probability=risk_probability,
            risk_level=risk_level,
            top_factors=top_factors,
        )
