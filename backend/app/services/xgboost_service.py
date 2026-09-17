"""
APDA MITRA — XGBoost AI Landslide Risk Service
=============================================
Manages inference against the canonical Apda Mitra XGBoost hazard model.

Features:
- Validates that the actual trained model exists (ml/models/apda_mitra_xgboost.joblib).
- If the model is not found or fails to load, strictly returns:
    status: "model_unavailable"
  so the UI displays: "AI RISK: MODEL NOT AVAILABLE" instead of a synthetic number.
- When the model is present, runs standard scaling, XGBoost classification,
  and TreeSHAP feature explainability.
- Never generates a fake percentage.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

logger = logging.getLogger("apda_mitra.services.xgboost_service")

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = WORKSPACE_ROOT / "ml" / "models" / "apda_mitra_xgboost.joblib"
SCALER_PATH = WORKSPACE_ROOT / "ml" / "models" / "scaler.joblib"
THRESHOLDS_PATH = WORKSPACE_ROOT / "ml" / "models" / "risk_thresholds.json"
METADATA_PATH = WORKSPACE_ROOT / "ml" / "models" / "model_metadata.json"


class XgboostService:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.explainer = None
        self.thresholds = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            if MODEL_PATH.exists() and SCALER_PATH.exists():
                self.model = joblib.load(str(MODEL_PATH))
                self.scaler = joblib.load(str(SCALER_PATH))
                import shap
                self.explainer = shap.TreeExplainer(self.model)
                logger.info("Successfully loaded Apda Mitra XGBoost model and TreeSHAP explainer.")
            else:
                logger.warning("XGBoost model files not found at %s. Marking as unavailable.", MODEL_PATH)
        except Exception as e:
            logger.error("Failed to load XGBoost model: %s", e)
            self.model = None

    def is_available(self) -> bool:
        return self.model is not None and self.scaler is not None

    def get_model_status(self) -> Dict[str, Any]:
        """
        Returns genuine health, loading status, and metadata for the XGBoost model.
        """
        is_loaded = self.is_available()
        meta = {}
        if METADATA_PATH.exists():
            try:
                import json
                with open(METADATA_PATH, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception as err:
                logger.warning("Could not read model_metadata.json: %s", err)

        return {
            "name": meta.get("model_name", "Apda Mitra Landslide Risk XGBoost Classifier"),
            "available": is_loaded,
            "loaded": is_loaded,
            "version": meta.get("xgboost_version", "2.1.4"),
            "algorithm": meta.get("algorithm", "XGBoost (Extreme Gradient Boosting)"),
            "training_timestamp_utc": meta.get("training_timestamp_utc"),
            "tree_shap_available": self.explainer is not None,
            "model_type": type(self.model).__name__ if self.model else None,
            "feature_count": len(meta.get("feature_list", [])) if meta.get("feature_list") else 11,
            "model_path": "ml/models/apda_mitra_xgboost.joblib"
        }

    def predict(
        self,
        latitude: float,
        longitude: float,
        rainfall_1h: Optional[float] = None,
        rainfall_3h: Optional[float] = None,
        rainfall_24h: Optional[float] = None,
        rainfall_7d: Optional[float] = None,
        rainfall_30d: Optional[float] = None,
        soil_moisture: Optional[float] = None,
        soil_moisture_anomaly: Optional[float] = None,
        elevation: Optional[float] = None,
        slope: Optional[float] = None,
        aspect: Optional[float] = None,
        curvature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate real XGBoost model or return model_unavailable.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        if not self.is_available():
            return {
                "status": "model_unavailable",
                "risk_probability": None,
                "risk_level": "MODEL NOT AVAILABLE",
                "model_version": None,
                "generated_at": now_iso,
                "features_used": None,
                "message": "AI RISK MODEL NOT AVAILABLE"
            }

        # Map inputs to canonical 10-feature vector expected by trained model
        # Canonical features: rain_1d, rain_3d, rain_7d, rain_30d, soil_moisture, soil_moisture_anomaly, elevation, slope, aspect, curvature
        rain_1d = rainfall_24h if rainfall_24h is not None else rainfall_1h
        rain_3d = rainfall_3h
        rain_7d = rainfall_7d
        rain_30d = rainfall_30d

        # Verify no essential feature is completely missing
        features_dict = {
            "rain_1d": rain_1d,
            "rain_3d": rain_3d,
            "rain_7d": rain_7d,
            "rain_30d": rain_30d,
            "soil_moisture": soil_moisture,
            "soil_moisture_anomaly": soil_moisture_anomaly,
            "elevation": elevation,
            "slope": slope,
            "aspect": aspect,
            "curvature": curvature
        }

        missing = [k for k, v in features_dict.items() if v is None]
        if missing:
            return {
                "status": "missing_features",
                "prediction_status": "INSUFFICIENT_DATA",
                "missing_features": missing,
                "risk_probability": None,
                "risk_percentage": None,
                "risk_level": "INSUFFICIENT DATA",
                "model_version": "Apda-Mitra-XGBoost-v2.0",
                "generated_at": now_iso,
                "features_used": features_dict,
                "message": f"Cannot evaluate AI risk: missing features {missing}. Synthetic substitution prohibited."
            }

        import numpy as np
        import pandas as pd

        feature_cols = [
            "rain_1d", "rain_3d", "rain_7d", "rain_30d",
            "soil_moisture", "soil_moisture_anomaly",
            "elevation", "slope", "aspect", "curvature"
        ]
        feature_vals = [float(features_dict[k]) for k in feature_cols]
        raw_df = pd.DataFrame([feature_vals], columns=feature_cols)

        # Apply standard scaler
        scaled_arr = self.scaler.transform(raw_df)
        scaled_df = pd.DataFrame(scaled_arr, columns=feature_cols)

        # Compute probability
        proba = float(self.model.predict_proba(scaled_df)[0][1])

        # Compute SHAP explanation
        top_factors = []
        if self.explainer:
            shap_values = self.explainer.shap_values(scaled_df)
            if hasattr(shap_values, "values"):
                sv = shap_values.values[0]
            elif isinstance(shap_values, list) and len(shap_values) == 2:
                sv = shap_values[1][0]
            else:
                sv = shap_values[0]

            indices = np.argsort(np.abs(sv))[::-1]
            for rank, idx in enumerate(indices[:4], start=1):
                col_name = feature_cols[idx]
                shap_val = float(sv[idx])
                abs_val = abs(shap_val)
                contrib = "high contribution" if abs_val >= 0.5 else ("moderate contribution" if abs_val >= 0.15 else "minor contribution")
                impact = "increases_risk" if shap_val > 0 else "decreases_risk"
                top_factors.append({
                    "rank": rank,
                    "feature": col_name,
                    "contribution": contrib,
                    "shap_value": round(shap_val, 4),
                    "impact": impact
                })

        # Determine risk level
        if proba >= 0.70:
            risk_level = "Critical"
        elif proba >= 0.40:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

        return {
            "status": "available",
            "risk_probability": round(proba, 4),
            "risk_percentage": round(proba * 100.0, 1),
            "risk_level": risk_level,
            "model_version": "Apda-Mitra-XGBoost-v2.0",
            "generated_at": now_iso,
            "features_used": features_dict,
            "top_factors": top_factors
        }


xgboost_service = XgboostService()
