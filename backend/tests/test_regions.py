"""
Tests for Apda Mitra 10-State Regional Disaster Monitoring Endpoints
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.region_config import TARGET_STATES

client = TestClient(app)


def test_get_states():
    response = client.get("/api/states")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 10
    state_names = [s["name"] for s in data["states"]]
    expected_states = [
        "Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh",
        "Assam", "Meghalaya", "Nagaland", "Manipur", "Mizoram", "Tripura"
    ]
    for exp in expected_states:
        assert exp in state_names


def test_get_state_details():
    response = client.get("/api/states/uttarakhand")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Uttarakhand"
    assert "bbox" in data


def test_get_state_districts():
    response = client.get("/api/states/himachal-pradesh/districts")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 5
    dist_names = [d["name"] for d in data["districts"]]
    assert "Shimla" in dist_names


def test_get_regional_landslides():
    response = client.get("/api/landslides/region?limit=20")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "NASA COOLR"
    assert "events" in data
    assert len(data["events"]) > 0
    # Every event must have real title, date, coordinates, trigger, source
    first = data["events"][0]
    assert "event_title" in first
    assert "latitude" in first
    assert "longitude" in first
    assert "trigger" in first
    assert first["source"] == "NASA COOLR"


def test_get_state_landslides():
    response = client.get("/api/landslides/state/uttarakhand?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "NASA COOLR"
    assert len(data["events"]) > 0


def test_predict_risk_model_unavailable_or_evaluated():
    payload = {
        "latitude": 30.3165,
        "longitude": 78.0322,
        "rainfall_24h": 45.2,
        "soil_moisture": 0.35,
        "elevation": 1800.0,
        "slope": 24.5
    }
    response = client.post("/api/risk/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    # Must never invent a fake number if model unavailable
    if data["status"] == "model_unavailable":
        assert data["risk_probability"] is None
        assert data["risk_level"] == "MODEL NOT AVAILABLE"
    elif data["status"] == "available":
        assert isinstance(data["risk_percentage"], (int, float))
