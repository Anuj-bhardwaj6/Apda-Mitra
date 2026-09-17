from __future__ import annotations

import pytest

from ai.config import RISK_THRESHOLDS
from ai.scripts.deployment.load_model import get_model_manager
from ai.scripts.explainability.shap_explainer import explain_prediction
from ai.scripts.training.predict import get_risk_level, predict_batch, predict_point


def test_risk_level_mapping():
    """Validates risk categorization against threshold bands."""
    assert get_risk_level(0.05) == "LOW"
    assert get_risk_level(0.35) == "MODERATE"
    assert get_risk_level(0.65) == "HIGH"
    assert get_risk_level(0.85) == "VERY_HIGH"
    assert get_risk_level(0.95) == "CRITICAL"
    assert get_risk_level(1.0) == "CRITICAL"


def test_point_prediction_bounds():
    """Ensures predict_point returns bounded probability and valid structure."""
    lat, lon = 27.33, 88.61
    res = predict_point(lat, lon)

    assert "probability" in res
    assert 0.0 <= res["probability"] <= 1.0
    assert res["risk_level"] in RISK_THRESHOLDS
    assert 0.0 <= res["confidence"] <= 1.0
    assert "features" in res
    assert "source" in res


def test_batch_prediction():
    """Ensures predict_batch returns equal count of structured responses."""
    points = [
        {"latitude": 27.33, "longitude": 88.61},
        {"latitude": 26.15, "longitude": 91.77},
        {"latitude": 25.57, "longitude": 91.89},
    ]
    results = predict_batch(points)
    assert len(results) == 3
    for r in results:
        assert 0.0 <= r["probability"] <= 1.0


def test_shap_explanation_structure():
    """Ensures SHAP engine produces both positive drivers and mitigating factors."""
    features = {
        "slope": 35.0,
        "rainfall_24h": 85.0,
        "rainfall_72h": 140.0,
        "soil_moisture_surface": 0.45,
        "distance_to_river_m": 120.0,
        "historical_landslide_density": 0.5,
    }
    exp = explain_prediction(features, generate_plot=False)

    assert "top_risk_drivers" in exp
    assert "top_mitigating_factors" in exp
    assert len(exp["top_risk_drivers"]) > 0
    # Rainfall and slope should be prominent risk drivers
    drivers_features = [d["feature"] for d in exp["top_risk_drivers"]]
    assert "rainfall_24h" in drivers_features or "slope" in drivers_features


def test_model_manager_singleton():
    """Verifies that ModelManager is a singleton and provides metadata."""
    mgr1 = get_model_manager()
    mgr2 = get_model_manager()
    assert mgr1 is mgr2

    meta = mgr1.get_metadata()
    assert "version" in meta
    assert "is_loaded" in meta
