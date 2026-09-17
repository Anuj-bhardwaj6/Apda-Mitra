"""
Explainability — SHAP Explainer
=================================
Calculates feature-level SHAP (SHapley Additive exPlanations) values for
individual landslide predictions using shap.TreeExplainer on the XGBoost model.

Generates:
  - Feature contributions (positive risk drivers vs mitigating factors)
  - Base expected value and prediction delta breakdown
  - Waterfall & summary plots saved to datasets/artifacts/
  - Structured explanation payloads for API and frontend display
"""

from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import ARTIFACTS_DIR, FEATURE_COLUMNS
from ai.logger import PipelineLogger

log = PipelineLogger("explainability.shap")

_EXPLAINER = None
_LAST_MODEL_ID = None


def _get_tree_explainer(model: Any):
    """Caches or instantiates a shap.TreeExplainer for the trained XGBoost model."""
    global _EXPLAINER, _LAST_MODEL_ID

    model_id = id(model)
    if _EXPLAINER is not None and _LAST_MODEL_ID == model_id:
        return _EXPLAINER

    try:
        import shap  # type: ignore[import-untyped,import-not-found]
        _EXPLAINER = shap.TreeExplainer(model)
        _LAST_MODEL_ID = model_id
        log.info("Initialized shap.TreeExplainer for model")
        return _EXPLAINER
    except Exception as exc:
        log.warning("Could not initialize shap.TreeExplainer", error=str(exc))
        return None


def _domain_heuristic_shap(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Domain physics explanation for the 4 pillars:
    1. Copernicus GLO-30 slope & terrain curvature
    2. NASA GPM IMERG satellite precipitation accumulation
    3. NASA/USDA SMAP volumetric soil saturation
    4. NASA COOLR historical failure context
    """
    contributions = []

    # 1. Copernicus GLO-30 Slope
    slope = features.get("copernicus_slope_deg", features.get("slope", 22.0))
    if slope > 32:
        val = +0.35
        desc = f"Copernicus GLO-30 steep terrain slope ({slope:.1f}°) concentrates gravitation shear stress"
    elif slope > 22:
        val = +0.18
        desc = f"Copernicus GLO-30 moderate slope angle ({slope:.1f}°) susceptible to slip failure"
    else:
        val = -0.15
        desc = f"Copernicus GLO-30 gentle terrain ({slope:.1f}°) provides natural slope stability"
    contributions.append({"feature": "copernicus_slope_deg", "value": slope, "shap_value": val, "reason": desc})

    # 2. NASA GPM IMERG Rainfall
    rain_1d = features.get("gpm_imerg_rainfall_1d_mm", features.get("rainfall_24h", 0.0))
    rain_3d = features.get("gpm_imerg_rainfall_3d_mm", features.get("rainfall_72h", 0.0))
    if rain_1d > 60 or rain_3d > 120:
        val = +0.38
        desc = f"NASA GPM IMERG torrential downpour ({rain_1d:.1f}mm 1-day / {rain_3d:.1f}mm 3-day) induces pore pressure"
    elif rain_1d > 25:
        val = +0.20
        desc = f"NASA GPM IMERG sustained precipitation ({rain_1d:.1f}mm 1-day) promotes subsoil saturation"
    else:
        val = -0.12
        desc = f"NASA GPM IMERG low precipitation ({rain_1d:.1f}mm 1-day) keeps hydrologic trigger minimal"
    contributions.append({"feature": "gpm_imerg_rainfall_1d_mm", "value": rain_1d, "shap_value": val, "reason": desc})

    # 3. NASA/USDA SMAP Soil Moisture
    soil = features.get("smap_surface_moisture_m3m3", features.get("soil_moisture_surface", 0.28))
    sat_ratio = features.get("smap_soil_saturation_ratio", min(0.99, soil / 0.50))
    if soil > 0.38 or sat_ratio > 0.75:
        val = +0.22
        desc = f"NASA/USDA SMAP high soil water saturation ({soil:.3f} m³/m³, {sat_ratio * 100:.0f}%) liquefies regolith"
    else:
        val = -0.08
        desc = f"NASA/USDA SMAP soil moisture ({soil:.3f} m³/m³) within safe cohesive threshold"
    contributions.append({"feature": "smap_surface_moisture_m3m3", "value": soil, "shap_value": val, "reason": desc})

    # 4. Copernicus GLO-30 Plan Curvature
    curv = features.get("copernicus_plan_curvature", features.get("curvature", -0.02))
    if curv < -0.03:
        val = +0.10
        desc = "Copernicus GLO-30 concave hollow focuses surface runoff & debris converge"
    else:
        val = -0.04
        desc = "Copernicus GLO-30 planar or convex terrain disperses water runoff"
    contributions.append({"feature": "copernicus_plan_curvature", "value": curv, "shap_value": val, "reason": desc})

    # Sort contributions by absolute SHAP value
    contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

    positive_drivers = [c for c in contributions if c["shap_value"] > 0]
    mitigating_factors = [c for c in contributions if c["shap_value"] < 0]

    return {
        "base_value": 0.20,
        "method": "domain_physics_heuristic",
        "contributions": contributions,
        "top_risk_drivers": positive_drivers[:3],
        "top_mitigating_factors": mitigating_factors[:3],
        "waterfall_plot_path": None,
        "waterfall_plot_base64": None,
    }


def explain_prediction(
    features: Dict[str, float],
    model: Any = None,
    scaler: Any = None,
    generate_plot: bool = False,
    save_filename: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Computes explanation for a single prediction vector.

    Args:
        features: Dictionary mapping feature names to numerical values
        model: Trained XGBoostClassifier instance
        scaler: Fitted StandardScaler instance
        generate_plot: If True, renders a waterfall plot image
        save_filename: Optional filename to save plot inside ARTIFACTS_DIR

    Returns:
        Structured explanation dict
    """
    if model is None:
        from ai.scripts.training.predict import _load_artifacts
        model, scaler = _load_artifacts()

    if model is None:
        log.info("No trained model available; returning domain heuristic explanation")
        return _domain_heuristic_shap(features)

    explainer = _get_tree_explainer(model)
    if explainer is None:
        return _domain_heuristic_shap(features)

    try:
        # Prepare feature row
        df_row = pd.DataFrame([features])[FEATURE_COLUMNS]
        if scaler is not None:
            X_input = scaler.transform(df_row)
        else:
            X_input = df_row.values

        shap_values = explainer(X_input)
        # shap_values[0] holds values for the first sample
        sample_shap = shap_values[0]
        vals = sample_shap.values
        base_val = float(sample_shap.base_values) if hasattr(sample_shap, "base_values") else 0.0

        contributions: List[Dict[str, Any]] = []
        for i, col in enumerate(FEATURE_COLUMNS):
            shap_val = float(vals[i])
            actual_val = float(features.get(col, 0.0))
            contributions.append({
                "feature": col,
                "value": actual_val,
                "shap_value": round(shap_val, 4),
            })

        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        positive_drivers = [c for c in contributions if c["shap_value"] > 0]
        mitigating_factors = [c for c in contributions if c["shap_value"] < 0]

        plot_path = None
        plot_base64 = None

        if generate_plot:
            try:
                import matplotlib.pyplot as plt  # type: ignore[import-not-found]
                import shap  # type: ignore[import-untyped,import-not-found]

                fig = plt.figure(figsize=(9, 6))
                shap.plots.waterfall(sample_shap, max_display=10, show=False)
                plt.title("Landslide Risk Factor Breakdown (SHAP)", fontsize=13, pad=15)
                plt.tight_layout()

                # Save to buffer for base64
                buf = io.BytesIO()
                plt.savefig(buf, format="png", dpi=130, bbox_inches="tight")
                buf.seek(0)
                plot_base64 = base64.b64encode(buf.read()).decode("utf-8")
                buf.close()

                if save_filename:
                    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
                    out_path = ARTIFACTS_DIR / save_filename
                    plt.savefig(str(out_path), dpi=150, bbox_inches="tight")
                    plot_path = str(out_path)

                plt.close(fig)
            except Exception as plot_err:
                log.warning("Waterfall plot generation failed", error=str(plot_err))

        return {
            "base_value": round(base_val, 4),
            "method": "shap_tree_explainer",
            "contributions": contributions,
            "top_risk_drivers": positive_drivers[:4],
            "top_mitigating_factors": mitigating_factors[:3],
            "waterfall_plot_path": plot_path,
            "waterfall_plot_base64": plot_base64,
        }

    except Exception as exc:
        log.warning("SHAP calculation encountered error; falling back to heuristic", error=str(exc))
        return _domain_heuristic_shap(features)


if __name__ == "__main__":
    test_feats = {
        "latitude": 27.33,
        "longitude": 88.61,
        "elevation": 1650.0,
        "slope": 34.5,
        "rainfall_24h": 78.0,
        "rainfall_72h": 142.0,
        "soil_moisture_surface": 0.44,
        "distance_to_river_m": 120.0,
        "historical_landslide_density": 0.65,
    }
    exp = explain_prediction(test_feats, generate_plot=False)
    print("\n🔍 SHAP Explanation Sample:")
    print(f"   Method: {exp['method']}")
    print(f"   Top Risk Drivers:")
    for d in exp["top_risk_drivers"]:
        print(f"     • {d['feature']} = {d['value']} (Impact: +{d['shap_value']:.3f})")
    print(f"   Top Mitigating Factors:")
    for m in exp["top_mitigating_factors"]:
        print(f"     • {m['feature']} = {m['value']} (Impact: {m['shap_value']:.3f})")
