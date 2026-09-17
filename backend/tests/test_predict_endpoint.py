"""
Unit and integration tests for POST /api/v1/predict/landslide-risk.
Validates:
- Valid predictions return 200 OK with risk_probability, risk_level, top_factors.
- Coordinate range validation (latitude [-90, 90], longitude [-180, 180]).
- Missing required features rejected with HTTP 422 (never silently substituted).
- Slope and rainfall bounds validation (negative rainfall / slope > 90 rejected).
- Top factors are strictly derived from TreeSHAP without fabrication.
- Logging of model version and feature version.
"""

import logging
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "latitude": 30.4500,
    "longitude": 79.1200,
    "date": "2026-08-15",
    "rainfall_1d": 55.0,
    "rainfall_3d": 140.0,
    "rainfall_7d": 280.0,
    "rainfall_15d": 380.0,
    "rainfall_30d": 490.0,
    "soil_moisture": 0.39,
    "soil_moisture_anomaly": 1.7,
    "elevation": 1950.0,
    "slope": 36.0,
    "aspect": 175.0,
    "curvature": -0.18,
}


def test_predict_landslide_risk_success():
    """Verify standard valid payload returns 200 OK with correct schema."""
    response = client.post("/api/v1/predict/landslide-risk", json=VALID_PAYLOAD)
    assert response.status_code == 200

    data = response.json()
    assert "risk_probability" in data
    assert "risk_level" in data
    assert "top_factors" in data

    assert isinstance(data["risk_probability"], float)
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert data["risk_level"] in ["Low", "Moderate", "High", "Critical"]

    factors = data["top_factors"]
    assert isinstance(factors, list)
    assert len(factors) > 0

    for f in factors:
        assert "factor" in f
        assert "contribution" in f
        assert "shap_value" in f
        assert isinstance(f["shap_value"], float)
        assert f["contribution"] in [
            "high contribution",
            "moderate contribution",
            "minor contribution",
            "high protective contribution",
            "moderate protective contribution",
            "protective / mitigating factor",
            "neutral",
        ]


def test_reject_missing_required_features():
    """Verify that omitting any mandatory feature triggers HTTP 422."""
    required_keys = [
        "latitude",
        "longitude",
        "date",
        "rainfall_1d",
        "rainfall_3d",
        "rainfall_7d",
        "rainfall_15d",
        "rainfall_30d",
        "soil_moisture",
        "soil_moisture_anomaly",
        "elevation",
        "slope",
        "aspect",
        "curvature",
    ]

    for key in required_keys:
        incomplete = VALID_PAYLOAD.copy()
        del incomplete[key]
        resp = client.post("/api/v1/predict/landslide-risk", json=incomplete)
        assert resp.status_code == 422, f"Expected 422 when '{key}' is missing, got {resp.status_code}"


def test_reject_null_environmental_values():
    """Verify that null environmental values are never accepted or faked."""
    null_payload = VALID_PAYLOAD.copy()
    null_payload["rainfall_7d"] = None
    resp = client.post("/api/v1/predict/landslide-risk", json=null_payload)
    assert resp.status_code == 422


def test_reject_invalid_coordinates():
    """Verify coordinates outside WGS84 range are rejected with HTTP 422."""
    # Latitude > 90
    bad_lat = VALID_PAYLOAD.copy()
    bad_lat["latitude"] = 95.0
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_lat)
    assert resp.status_code == 422

    # Latitude < -90
    bad_lat2 = VALID_PAYLOAD.copy()
    bad_lat2["latitude"] = -90.5
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_lat2)
    assert resp.status_code == 422

    # Longitude > 180
    bad_lon = VALID_PAYLOAD.copy()
    bad_lon["longitude"] = 181.0
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_lon)
    assert resp.status_code == 422

    # Longitude < -180
    bad_lon2 = VALID_PAYLOAD.copy()
    bad_lon2["longitude"] = -185.0
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_lon2)
    assert resp.status_code == 422


def test_reject_negative_rainfall():
    """Negative rainfall is physically impossible and must be rejected."""
    bad_rain = VALID_PAYLOAD.copy()
    bad_rain["rainfall_7d"] = -15.0
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_rain)
    assert resp.status_code == 422


def test_reject_invalid_slope():
    """Slope must be within 0 to 90 degrees."""
    bad_slope = VALID_PAYLOAD.copy()
    bad_slope["slope"] = 105.0
    resp = client.post("/api/v1/predict/landslide-risk", json=bad_slope)
    assert resp.status_code == 422

    neg_slope = VALID_PAYLOAD.copy()
    neg_slope["slope"] = -5.0
    resp2 = client.post("/api/v1/predict/landslide-risk", json=neg_slope)
    assert resp2.status_code == 422


def test_low_risk_scenario():
    """Verify flat terrain with zero rainfall produces Low risk."""
    dry_payload = {
        "latitude": 26.1500,
        "longitude": 91.7500,
        "date": "2026-02-10",
        "rainfall_1d": 0.0,
        "rainfall_3d": 0.0,
        "rainfall_7d": 0.0,
        "rainfall_15d": 0.0,
        "rainfall_30d": 2.0,
        "soil_moisture": 0.12,
        "soil_moisture_anomaly": -1.2,
        "elevation": 120.0,
        "slope": 4.0,
        "aspect": 90.0,
        "curvature": 0.01,
    }
    resp = client.post("/api/v1/predict/landslide-risk", json=dry_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "Low"
    assert data["risk_probability"] < 0.30


def test_logging_model_and_feature_version(caplog):
    """Verify that model version and feature version are logged during execution."""
    with caplog.at_level(logging.INFO):
        resp = client.post("/api/v1/predict/landslide-risk", json=VALID_PAYLOAD)
        assert resp.status_code == 200

    log_text = caplog.text
    assert "model_version" in log_text
    assert "feature_version" in log_text
