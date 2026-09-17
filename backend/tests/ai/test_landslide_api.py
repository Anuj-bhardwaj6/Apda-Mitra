from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_predict_landslide_endpoint(client: TestClient):
    """Tests single point landslide prediction endpoint."""
    payload = {
        "latitude": 27.3389,
        "longitude": 88.6065,
        "rainfall_24h": 65.0,
        "rainfall_72h": 110.0,
        "slope": 32.0,
        "include_shap": True,
    }
    response = client.post("/api/v1/ai/landslide/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    res = data["data"]
    assert res["latitude"] == 27.3389
    assert res["longitude"] == 88.6065
    assert 0.0 <= res["probability"] <= 1.0
    assert res["risk_level"] in ["LOW", "MODERATE", "HIGH", "VERY_HIGH", "CRITICAL"]
    assert "recommendation" in res
    assert "explanation" in res


def test_predict_batch_endpoint(client: TestClient):
    """Tests batch prediction endpoint."""
    payload = {
        "points": [
            {"latitude": 27.33, "longitude": 88.61},
            {"latitude": 25.57, "longitude": 91.89},
        ],
        "include_shap": False,
    }
    response = client.post("/api/v1/ai/landslide/predict-batch", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2


def test_model_metadata_endpoint(client: TestClient):
    """Tests retrieval of active model metadata."""
    response = client.get("/api/v1/ai/landslide/model")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "version" in data["data"]
    assert "is_loaded" in data["data"]


def test_model_features_endpoint(client: TestClient):
    """Tests feature listing and importance endpoint."""
    response = client.get("/api/v1/ai/landslide/features")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "features" in data["data"]
    assert "total_features" in data["data"]


def test_retrain_status_endpoint_not_found(client: TestClient):
    """Tests polling status for an unknown job."""
    response = client.get("/api/v1/ai/landslide/retrain/status/job_invalid_test")
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["status"] == "UNKNOWN"
