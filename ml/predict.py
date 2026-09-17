"""
APDA MITRA — Explainable Landslide Risk Prediction Utility
==========================================================
Provides real-time inference and SHAP-driven feature explainability for the
canonical Apda Mitra XGBoost landslide hazard model.

Features:
- Inputs: latitude, longitude, date, and environmental features
- Outputs: risk_probability, experimental risk_level, top_contributing_features,
  and formatted human-readable explanation.
- Explainability: Uses shap.TreeExplainer directly on the XGBoost model to compute
  exact additive log-odds attributions. No fabricated explanations.
- Risk Thresholds: Reads calibrated experimental levels from ml/models/risk_thresholds.json.

Disclaimer:
Thresholds and outputs are experimental research metrics and do NOT represent
official statutory emergency warning levels (such as from NDMA, GSI, or IMD).
"""

from __future__ import annotations

import argparse
from datetime import date, datetime
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import joblib
import numpy as np
import pandas as pd
import shap

logger = logging.getLogger("apda_mitra.ml.predict")

# Paths
MODULE_DIR = Path(__file__).resolve().parent
MODELS_DIR = MODULE_DIR / "models"
DEFAULT_MODEL_PATH = MODELS_DIR / "apda_mitra_xgboost.joblib"
DEFAULT_SCALER_PATH = MODELS_DIR / "scaler.joblib"
DEFAULT_FEATURES_PATH = MODELS_DIR / "features.json"
DEFAULT_THRESHOLDS_PATH = MODELS_DIR / "risk_thresholds.json"

# Canonical feature names expected by the trained scaler & XGBoost model
CANONICAL_FEATURES = [
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

# Friendly display names for reporting
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

# Feature units for rich context
FEATURE_UNITS = {
    "rain_1d": "mm",
    "rain_3d": "mm",
    "rain_7d": "mm",
    "rain_30d": "mm",
    "soil_moisture": "m³/m³",
    "soil_moisture_anomaly": "σ",
    "elevation": "m",
    "slope": "degrees",
    "aspect": "degrees",
    "curvature": "m⁻¹",
}

# Common alias mapping for convenience
FEATURE_ALIASES = {
    "rainfall_1d": "rain_1d",
    "rain1d": "rain_1d",
    "rainfall_3d": "rain_3d",
    "rain3d": "rain_3d",
    "rainfall_7d": "rain_7d",
    "rain7d": "rain_7d",
    "rainfall_30d": "rain_30d",
    "rain30d": "rain_30d",
    "sm": "soil_moisture",
    "smap": "soil_moisture",
    "soil_moisture_saturation": "soil_moisture",
    "sm_anomaly": "soil_moisture_anomaly",
    "dem": "elevation",
    "altitude": "elevation",
    "slope_degrees": "slope",
    "slope_deg": "slope",
    "aspect_deg": "aspect",
}

# Alias resolution mapping for convenience (names map to identical canonical features)


class ApdaMitraPredictor:
    """
    Production-grade predictor and explainability engine for Apda Mitra.
    Caches model, scaler, and SHAP TreeExplainer instances.
    """

    def __init__(
        self,
        model_path: Optional[Union[str, Path]] = None,
        scaler_path: Optional[Union[str, Path]] = None,
        features_path: Optional[Union[str, Path]] = None,
        thresholds_path: Optional[Union[str, Path]] = None,
    ):
        self.model_path = Path(model_path or DEFAULT_MODEL_PATH)
        self.scaler_path = Path(scaler_path or DEFAULT_SCALER_PATH)
        self.features_path = Path(features_path or DEFAULT_FEATURES_PATH)
        self.thresholds_path = Path(thresholds_path or DEFAULT_THRESHOLDS_PATH)

        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Loads and verifies model, scaler, metadata, and SHAP TreeExplainer."""
        if not self.model_path.exists():
            raise FileNotFoundError(f"XGBoost model file not found at {self.model_path}")
        if not self.scaler_path.exists():
            raise FileNotFoundError(f"Scaler file not found at {self.scaler_path}")

        # Load model and scaler
        self.model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)

        # Load feature specification
        if self.features_path.exists():
            with open(self.features_path, "r", encoding="utf-8") as f:
                features_data = json.load(f)
                self.feature_names = features_data.get("features", CANONICAL_FEATURES)
        else:
            self.feature_names = CANONICAL_FEATURES

        # Load experimental thresholds
        if self.thresholds_path.exists():
            with open(self.thresholds_path, "r", encoding="utf-8") as f:
                self.thresholds_config = json.load(f)
        else:
            self.thresholds_config = {
                "_disclaimer": "EXPERIMENTAL MAPPING ONLY. Not official emergency thresholds.",
                "status": "experimental",
                "thresholds": {
                    "low": {"level": "Low", "min_probability": 0.0, "max_probability": 0.30},
                    "moderate": {"level": "Moderate", "min_probability": 0.30, "max_probability": 0.55},
                    "high": {"level": "High", "min_probability": 0.55, "max_probability": 0.75},
                    "critical": {"level": "Critical", "min_probability": 0.75, "max_probability": 1.0},
                },
            }

        # Initialize SHAP TreeExplainer for exact Shapley values on tree ensembles
        self.explainer = shap.TreeExplainer(self.model)

    def map_risk_level(self, probability: float) -> Tuple[str, Dict[str, Any]]:
        """
        Maps probability to documented experimental risk level.
        Thresholds are explicitly experimental and not statutory emergency thresholds.
        """
        p = max(0.0, min(1.0, float(probability)))
        thresholds = self.thresholds_config.get("thresholds", {})

        for _, info in thresholds.items():
            min_p = info.get("min_probability", 0.0)
            max_p = info.get("max_probability", 1.0)
            # Use inclusive upper bound for top bracket
            if min_p <= p < max_p or (p == 1.0 and max_p == 1.0):
                return info.get("level", "Unknown"), info

        return "Low", thresholds.get("low", {"level": "Low"})

    def prepare_feature_vector(
        self,
        environmental_features: Optional[Dict[str, Any]] = None,
        **extra_features: Any,
    ) -> Tuple[pd.DataFrame, Dict[str, float]]:
        """
        Validates, resolves aliases, and aligns input features to canonical order.
        """
        raw_inputs: Dict[str, Any] = {}
        if environmental_features:
            raw_inputs.update(environmental_features)
        raw_inputs.update(extra_features)

        resolved_inputs: Dict[str, float] = {}

        # Resolve aliases
        for key, value in raw_inputs.items():
            if value is None:
                continue
            canonical_key = FEATURE_ALIASES.get(key, key)
            if canonical_key in self.feature_names:
                try:
                    resolved_inputs[canonical_key] = float(value)
                except (ValueError, TypeError):
                    logger.warning("Could not convert feature %s=%r to float", key, value)

        # Strictly verify that all required canonical features are provided.
        # NEVER fabricate environmental values just to make the pipeline run.
        missing_features = [f for f in self.feature_names if f not in resolved_inputs]
        if missing_features:
            raise ValueError(
                f"Missing required environmental feature(s): {missing_features}. "
                "Apda Mitra policy strictly forbids fabricating environmental values just to make the pipeline run. "
                "All 10 canonical features must be authentically observed and provided."
            )

        final_features: Dict[str, float] = {
            feature: resolved_inputs[feature] for feature in self.feature_names
        }

        df = pd.DataFrame([final_features], columns=self.feature_names)
        return df, final_features

    def explain(
        self,
        df_raw: pd.DataFrame,
        df_scaled: pd.DataFrame,
        top_k: int = 4,
    ) -> Tuple[List[Dict[str, Any]], str, Dict[str, float]]:
        """
        Computes exact SHAP attributions using TreeExplainer.
        Categorizes contributions without fabricating explanations:
        - Features pushing toward landslide have positive SHAP values.
        - Magnitude classification:
            * High contribution: Top-tier drivers of elevated hazard
            * Moderate contribution: Substantial secondary contributors
            * Minor contribution: Subtle or negligible influence
        """
        shap_values_obj = self.explainer(df_scaled)
        shap_raw = shap_values_obj.values[0]  # Shape: (num_features,)

        shap_dict = {
            feat: float(shap_raw[idx])
            for idx, feat in enumerate(self.feature_names)
        }

        # Identify positive contributors (features that increase risk score)
        # If no features increase risk (all <= 0), sort by largest (least negative) attribution
        positive_contributors = [
            (feat, shap_dict[feat])
            for feat in self.feature_names
            if shap_dict[feat] > 1e-4
        ]

        if positive_contributors:
            # Sort descending by positive contribution
            ranked_factors = sorted(positive_contributors, key=lambda x: x[1], reverse=True)
            max_shap = ranked_factors[0][1]
            sum_pos = sum(val for _, val in ranked_factors)
        else:
            # Fall back to absolute largest magnitude
            ranked_factors = sorted(
                [(feat, shap_dict[feat]) for feat in self.feature_names],
                key=lambda x: abs(x[1]),
                reverse=True,
            )
            max_shap = max(abs(val) for _, val in ranked_factors) if ranked_factors else 1.0
            sum_pos = 1.0

        top_contributing_features: List[Dict[str, Any]] = []

        for feat, val in ranked_factors[:top_k]:
            display_name = FEATURE_DISPLAY_NAMES.get(feat, feat)
            raw_value = float(df_raw[feat].iloc[0])
            unit = FEATURE_UNITS.get(feat, "")

            # Relative impact thresholds based on genuine SHAP proportion
            ratio_to_max = (val / max_shap) if max_shap > 0 else 0.0
            share_of_positive = (val / sum_pos) if sum_pos > 0 else 0.0

            if val > 0:
                # High contribution:
                # Either absolute log-odds shift >= 1.0 or relative share >= 40% of max or >= 30% of total positive push
                if val >= 1.0 or ratio_to_max >= 0.40 or share_of_positive >= 0.30:
                    contribution_level = "high contribution"
                # Moderate contribution:
                # Either absolute log-odds shift >= 0.20 or relative share >= 15% of max or >= 10% of total positive push
                elif val >= 0.20 or ratio_to_max >= 0.15 or share_of_positive >= 0.10:
                    contribution_level = "moderate contribution"
                else:
                    contribution_level = "minor contribution"
                direction = "increases_risk"
            elif val < 0:
                if abs(val) >= 1.0 or (max_shap > 0 and abs(val) / max_shap >= 0.40):
                    contribution_level = "high protective contribution"
                elif abs(val) >= 0.20 or (max_shap > 0 and abs(val) / max_shap >= 0.15):
                    contribution_level = "moderate protective contribution"
                else:
                    contribution_level = "protective / mitigating factor"
                direction = "decreases_risk"
            else:
                contribution_level = "neutral"
                direction = "neutral"

            top_contributing_features.append({
                "feature": feat,
                "display_name": display_name,
                "feature_value": raw_value,
                "unit": unit,
                "shap_value": round(val, 4),
                "contribution_level": contribution_level,
                "direction": direction,
                "summary": f"{display_name} — {contribution_level}",
            })

        # Build clean formatted text matching the requested specification:
        # risk_score: 0.82
        #
        # major factors:
        #
        # 1. 7-day rainfall — high contribution
        # 2. slope — high contribution
        # 3. soil moisture — moderate contribution
        # 4. elevation — moderate contribution
        explanation_lines: List[str] = ["major factors:", ""]
        for idx, item in enumerate(top_contributing_features, start=1):
            explanation_lines.append(f"{idx}. {item['display_name']} — {item['contribution_level']}")

        formatted_explanation = "\n".join(explanation_lines)

        return top_contributing_features, formatted_explanation, shap_dict

    def predict(
        self,
        latitude: float,
        longitude: float,
        date_val: Union[str, date, datetime],
        environmental_features: Optional[Dict[str, Any]] = None,
        top_k: int = 4,
        **extra_features: Any,
    ) -> Dict[str, Any]:
        """
        Executes prediction and explainability for a geographic point and date.

        Returns:
            Dict containing:
            - risk_probability: float
            - risk_level: str ("Low", "Moderate", "High", "Critical")
            - top_contributing_features: list of factor dicts
            - explanation: formatted explanation text
            - full_report: complete string report
            - metadata: experimental status, lat, lon, date
        """
        # Normalize date
        if isinstance(date_val, (date, datetime)):
            date_str = date_val.strftime("%Y-%m-%d")
        else:
            date_str = str(date_val)

        # Prepare feature vector
        df_raw, final_features = self.prepare_feature_vector(
            environmental_features=environmental_features,
            **extra_features,
        )

        # Scale features using pre-fitted StandardScaler
        scaled_array = self.scaler.transform(df_raw)
        df_scaled = pd.DataFrame(scaled_array, columns=self.feature_names)

        # XGBoost prediction
        proba = float(self.model.predict_proba(df_scaled)[0, 1])
        risk_probability = round(proba, 4)

        # Experimental risk level mapping
        risk_level, tier_info = self.map_risk_level(risk_probability)

        # SHAP Explainability
        top_factors, factors_text, all_shap = self.explain(
            df_raw=df_raw,
            df_scaled=df_scaled,
            top_k=top_k,
        )

        # Full human-readable report
        full_report = (
            f"risk_score: {risk_probability:.2f}\n\n"
            f"{factors_text}"
        )

        return {
            "latitude": float(latitude),
            "longitude": float(longitude),
            "date": date_str,
            "risk_probability": risk_probability,
            "risk_level": risk_level,
            "top_contributing_features": top_factors,
            "explanation": factors_text,
            "full_report": full_report,
            "shap_values": all_shap,
            "feature_values": final_features,
            "threshold_tier": tier_info,
            "experimental_disclaimer": self.thresholds_config.get(
                "_disclaimer",
                "EXPERIMENTAL MAPPING ONLY. Not official emergency thresholds.",
            ),
        }


# Global singleton predictor instance
_PREDICTOR_INSTANCE: Optional[ApdaMitraPredictor] = None


def get_predictor() -> ApdaMitraPredictor:
    """Returns or lazily creates singleton ApdaMitraPredictor."""
    global _PREDICTOR_INSTANCE
    if _PREDICTOR_INSTANCE is None:
        _PREDICTOR_INSTANCE = ApdaMitraPredictor()
    return _PREDICTOR_INSTANCE


def predict(
    latitude: float,
    longitude: float,
    date: Union[str, date, datetime],
    environmental_features: Optional[Dict[str, Any]] = None,
    top_k: int = 4,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Main prediction utility function.

    Args:
        latitude: Geographic latitude in decimal degrees.
        longitude: Geographic longitude in decimal degrees.
        date: Date of observation or forecast (str 'YYYY-MM-DD' or datetime).
        environmental_features: Dict of environmental features (e.g. rain_7d, slope).
        top_k: Number of major contributing factors to extract.
        **kwargs: Additional or direct feature overrides.

    Returns:
        Dict with risk_probability, risk_level, top_contributing_features, explanation.
    """
    predictor = get_predictor()
    return predictor.predict(
        latitude=latitude,
        longitude=longitude,
        date_val=date,
        environmental_features=environmental_features,
        top_k=top_k,
        **kwargs,
    )


# Intuitive function alias
predict_risk = predict


def main():
    """Command-line interface for running predictions with SHAP explainability."""
    parser = argparse.ArgumentParser(
        description="Apda Mitra XGBoost Landslide Risk Predictor & SHAP Explainability Engine",
    )
    parser.add_argument("--lat", type=float, default=30.3165, help="Latitude (default: 30.3165)")
    parser.add_argument("--lon", type=float, default=78.0322, help="Longitude (default: 78.0322)")
    parser.add_argument(
        "--date",
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help="Date YYYY-MM-DD",
    )
    parser.add_argument("--rain-1d", type=float, default=None, help="1-day rainfall (mm)")
    parser.add_argument("--rain-3d", type=float, default=None, help="3-day rainfall (mm)")
    parser.add_argument("--rain-7d", type=float, default=None, help="7-day rainfall (mm)")
    parser.add_argument("--rain-30d", type=float, default=None, help="30-day rainfall (mm)")
    parser.add_argument("--soil-moisture", type=float, default=None, help="Soil moisture (m3/m3)")
    parser.add_argument("--slope", type=float, default=None, help="Slope (degrees)")
    parser.add_argument("--elevation", type=float, default=None, help="Elevation (m)")
    parser.add_argument("--json-input", type=str, default=None, help="Raw JSON feature string")
    parser.add_argument("--demo", action="store_true", help="Run demonstration scenarios")

    args = parser.parse_args()

    if args.demo:
        print("\n" + "=" * 70)
        print("APDA MITRA — DEMONSTRATION RUN: EXPLAINABLE LANDSLIDE RISK")
        print("=" * 70)

        demo_scenarios = [
            {
                "name": "Scenario A: Severe Monsoon Cloudburst on Steep Himalayan Slope (Uttarakhand)",
                "lat": 30.45,
                "lon": 79.12,
                "date": "2026-07-28",
                "features": {
                    "rain_1d": 65.0,
                    "rain_3d": 160.0,
                    "rain_7d": 310.0,
                    "rain_30d": 520.0,
                    "soil_moisture": 0.42,
                    "soil_moisture_anomaly": 2.1,
                    "elevation": 2100.0,
                    "slope": 38.5,
                    "aspect": 160.0,
                    "curvature": -0.22,
                },
            },
            {
                "name": "Scenario B: Dry Pre-Monsoon Baseline in Gentle Valley",
                "lat": 26.15,
                "lon": 91.75,
                "date": "2026-03-15",
                "features": {
                    "rain_1d": 0.0,
                    "rain_3d": 2.0,
                    "rain_7d": 8.0,
                    "rain_30d": 25.0,
                    "soil_moisture": 0.14,
                    "soil_moisture_anomaly": -0.8,
                    "elevation": 450.0,
                    "slope": 8.0,
                    "aspect": 90.0,
                    "curvature": 0.01,
                },
            },
            {
                "name": "Scenario C: Moderate Rain with Prolonged Antecedent Saturation",
                "lat": 27.33,
                "lon": 88.61,
                "date": "2026-08-10",
                "features": {
                    "rain_1d": 25.0,
                    "rain_3d": 70.0,
                    "rain_7d": 180.0,
                    "rain_30d": 390.0,
                    "soil_moisture": 0.32,
                    "soil_moisture_anomaly": 1.1,
                    "elevation": 1650.0,
                    "slope": 26.0,
                    "aspect": 210.0,
                    "curvature": -0.08,
                },
            },
        ]

        for sc in demo_scenarios:
            print(f"\n[*] {sc['name']}")
            print(f"  Coordinates: ({sc['lat']}, {sc['lon']}) | Date: {sc['date']}")
            result = predict(
                latitude=sc["lat"],
                longitude=sc["lon"],
                date=sc["date"],
                environmental_features=sc["features"],
            )

            print(f"\n{result['full_report']}")
            print(f"Experimental Risk Level: {result['risk_level']}")
            print(f"Disclaimer: {result['experimental_disclaimer']}")
            print("-" * 70)

        return

    # CLI Execution
    env_features: Dict[str, Any] = {}
    if args.json_input:
        env_features = json.loads(args.json_input)
    else:
        if args.rain_1d is not None:
            env_features["rain_1d"] = args.rain_1d
        if args.rain_3d is not None:
            env_features["rain_3d"] = args.rain_3d
        if args.rain_7d is not None:
            env_features["rain_7d"] = args.rain_7d
        if args.rain_30d is not None:
            env_features["rain_30d"] = args.rain_30d
        if args.soil_moisture is not None:
            env_features["soil_moisture"] = args.soil_moisture
        if args.slope is not None:
            env_features["slope"] = args.slope
        if args.elevation is not None:
            env_features["elevation"] = args.elevation

    result = predict(
        latitude=args.lat,
        longitude=args.lon,
        date=args.date,
        environmental_features=env_features,
    )

    print(f"\n{result['full_report']}")
    print(f"risk_level: {result['risk_level']}")


if __name__ == "__main__":
    main()
