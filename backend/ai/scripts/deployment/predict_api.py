"""
Model Deployment — Inference Service Layer
============================================
Provides high-level inference functions designed for direct consumption by
FastAPI endpoints and internal backend microservices.

Capabilities:
  - Single-point inference with automatic feature compilation & caching
  - Automatic on-demand SHAP explanation generation
  - Actionable civil defence & NDRF/SDRF emergency recommendations
  - Batch geospatial screening
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.logger import PipelineLogger
from ai.scripts.deployment.load_model import get_model_manager
from ai.scripts.explainability.shap_explainer import explain_prediction
from ai.scripts.training.predict import assemble_features_for_point, get_risk_level, predict_point

log = PipelineLogger("deployment.predict_api")

ACTION_RECOMMENDATIONS: Dict[str, Dict[str, Any]] = {
    "CRITICAL": {
        "alert_level": "RED",
        "action_title": "IMMEDIATE EVACUATION REQUIRED",
        "civil_defence_action": "Deploy NDRF/SDRF teams. Trigger localized siren broadcast. Establish incident command post.",
        "citizen_instructions": [
            "Evacuate slope-adjacent structures immediately to designated relief shelters.",
            "Avoid valley channels, road cuttings, and stream corridors.",
            "Disconnect gas and electrical mains before evacuating.",
            "Do not stop to salvage heavy possessions; prioritize human and livestock life.",
        ],
        "shelter_activation": True,
    },
    "VERY_HIGH": {
        "alert_level": "ORANGE",
        "action_title": "PRE-EMPTIVE EVACUATION ADVISORY",
        "civil_defence_action": "Place emergency rescue units on standby. Inspect critical road corridors (NH-10, NH-29).",
        "citizen_instructions": [
            "Prepare emergency survival kits (documents, flashlights, first aid, medicine).",
            "Identify nearest safe shelter routes via Apda Mitra offline map.",
            "Refrain from night driving on mountain highways.",
            "Stay alert for anomalous sounds (rumbling, tree snapping, sudden water clouding).",
        ],
        "shelter_activation": True,
    },
    "HIGH": {
        "alert_level": "YELLOW",
        "action_title": "LANDSLIDE WATCH ALERT",
        "civil_defence_action": "Issue weather warnings to district collectors. Monitor automated rain gauges (ARG).",
        "citizen_instructions": [
            "Monitor local government disaster bulletins.",
            "Clear debris from roof drains and perimeter stormwater channels.",
            "Report new soil cracks or retaining wall bulges via the Apda Mitra Citizen Report tool.",
        ],
        "shelter_activation": False,
    },
    "MODERATE": {
        "alert_level": "YELLOW_LOW",
        "action_title": "ELEVATED VIGILANCE",
        "civil_defence_action": "Standard monsoon monitoring. Log citizen telemetry.",
        "citizen_instructions": [
            "Stay informed of 24h precipitation forecasts.",
            "Exercise caution near steep road cuts during prolonged rain.",
        ],
        "shelter_activation": False,
    },
    "LOW": {
        "alert_level": "GREEN",
        "action_title": "NORMAL CONDITIONS",
        "civil_defence_action": "Routine surveillance. Background data assimilation.",
        "citizen_instructions": [
            "No immediate landslide danger detected.",
            "Maintain general disaster preparedness.",
        ],
        "shelter_activation": False,
    },
}


def predict_landslide_risk(
    latitude: float,
    longitude: float,
    overrides: Optional[Dict[str, Any]] = None,
    include_shap: bool = True,
    generate_plot: bool = False,
    db_session: Any = None,
) -> Dict[str, Any]:
    """
    Core API inference function for a single coordinate.

    Args:
        latitude: Target latitude
        longitude: Target longitude
        overrides: Optional feature values (e.g. simulation/override weather)
        include_shap: Whether to compute SHAP factor breakdown
        generate_plot: Whether to render a waterfall plot
        db_session: Optional DB session for citizen report assimilation

    Returns:
        Structured payload matching FastAPI response contract
    """
    model_mgr = get_model_manager()
    model = model_mgr.get_model()
    scaler = model_mgr.get_scaler()

    # Perform point prediction
    pred = predict_point(
        lat=latitude,
        lon=longitude,
        overrides=overrides,
        db_session=db_session,
    )

    risk_level = pred["risk_level"]
    prob = pred["probability"]
    features = pred["features"]
    rec = ACTION_RECOMMENDATIONS.get(risk_level, ACTION_RECOMMENDATIONS["LOW"])

    # Compute SHAP explanation if requested
    shap_data = None
    if include_shap:
        try:
            shap_data = explain_prediction(
                features=features,
                model=model,
                scaler=scaler,
                generate_plot=generate_plot,
            )
        except Exception as exc:
            log.warning("SHAP explanation generation skipped", error=str(exc))

    response: Dict[str, Any] = {
        "latitude": latitude,
        "longitude": longitude,
        "probability": prob,
        "risk_level": risk_level,
        "confidence": pred.get("confidence", 0.90),
        "source": pred.get("source", "xgboost_ner_model"),
        "model_version": model_mgr.get_version(),
        "timestamp": pred.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "recommendation": rec,
        "features": features,
        "explanation": shap_data,
    }

    return response


def predict_landslide_risk_batch(
    points: List[Dict[str, Any]],
    include_shap: bool = False,
    db_session: Any = None,
) -> List[Dict[str, Any]]:
    """Batch prediction service for multiple coordinate nodes."""
    results = []
    for pt in points:
        lat = float(pt["latitude"])
        lon = float(pt["longitude"])
        overrides = {k: v for k, v in pt.items() if k not in ["latitude", "longitude"]}
        results.append(
            predict_landslide_risk(
                latitude=lat,
                longitude=lon,
                overrides=overrides,
                include_shap=include_shap,
                generate_plot=False,
                db_session=db_session,
            )
        )
    return results
