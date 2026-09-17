"""
APDA MITRA — Test Suite for Real Data Architecture
==================================================
Tests:
1. NASA COOLR live endpoint returns structured provenance and events or safe status
2. NASA GPM IMERG returns real observation timestamp and latency
3. NASA LHASA returns categorized hazard nowcast
4. NASA SMAP returns real soil moisture or explicit DATA UNAVAILABLE (no fake numbers)
5. Copernicus DEM returns static terrain
6. XGBoost service returns real inference or model_unavailable
7. Unified telemetry endpoint /api/telemetry/unified
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_unified_telemetry_endpoint():
    resp = client.get("/api/telemetry/unified?latitude=25.532&longitude=91.865")
    assert resp.status_code == 200
    data = resp.json()

    assert "coordinates" in data
    assert "nasa_observations" in data
    assert "nasa_nowcast" in data
    assert "apda_mitra_ai_prediction" in data

    # 1. NASA GPM IMERG Rainfall
    rainfall = data["nasa_observations"]["rainfall"]
    assert rainfall["source"] == "NASA GPM IMERG"
    assert rainfall["status"] in ["LIVE", "STALE", "UNAVAILABLE"]
    if rainfall["status"] == "LIVE":
        assert rainfall["observation_time"] is not None
        assert isinstance(rainfall["latency_minutes"], int)
        assert rainfall["value_mm"] is not None

    # 2. NASA SMAP Soil Moisture
    soil = data["nasa_observations"]["soil_moisture"]
    assert "SMAP" in soil["source"]
    assert soil["status"] in ["LIVE", "STALE", "UNAVAILABLE"]
    if soil["status"] == "UNAVAILABLE":
        assert soil["display_value"] == "DATA UNAVAILABLE"
        assert soil["soil_moisture_percent"] is None

    # 3. Copernicus DEM
    terrain = data["nasa_observations"]["terrain"]
    assert terrain["source"] == "Copernicus DEM"
    assert terrain["status"] in ["STATIC BASELINE", "LIVE", "STALE", "UNAVAILABLE"]

    # 4. NASA LHASA
    lhasa = data["nasa_nowcast"]
    assert lhasa["source"] == "NASA LHASA"
    assert lhasa["hazard_level"] in ["HIGH", "MODERATE", "LOW", "UNAVAILABLE"]

    # 5. Apda Mitra AI Prediction
    ai = data["apda_mitra_ai_prediction"]
    assert ai["source"] == "Apda Mitra AI"
    assert ai["status"] in ["available", "model_unavailable", "missing_features"]


def test_live_landslides_endpoint():
    resp = client.get("/api/landslides/live?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "NASA COOLR" in data["source"]
    assert "fetched_at" in data
    assert "events" in data
    assert isinstance(data["events"], list)
    assert data["status"] in ["HISTORICAL", "LIVE", "STALE", "UNAVAILABLE"]
    if data["events"]:
        assert data["events"][0]["status"] == "HISTORICAL"


def test_predict_risk_endpoint():
    # Valid input with full features
    payload = {
        "latitude": 25.532,
        "longitude": 91.865,
        "rainfall_1h": 5.2,
        "rainfall_3h": 18.0,
        "rainfall_24h": 68.4,
        "rainfall_7d": 142.0,
        "rainfall_30d": 320.0,
        "soil_moisture": 0.38,
        "soil_moisture_anomaly": 1.2,
        "elevation": 1450.0,
        "slope": 32.5,
        "aspect": 180.0,
        "curvature": -0.05
    }
    resp = client.post("/api/risk/predict", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["status"] in ["available", "model_unavailable"]
    if res["status"] == "available":
        assert "risk_probability" in res
        assert 0.0 <= res["risk_probability"] <= 1.0
        assert "top_factors" in res


def test_predict_risk_missing_features():
    # Missing required features should never return a fake score
    payload = {
        "latitude": 25.532,
        "longitude": 91.865
    }
    resp = client.post("/api/risk/predict", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["status"] in ["missing_features", "model_unavailable"]
    assert res["risk_probability"] is None


def test_live_alerts_endpoint():
    resp = client.get("/api/alerts/live")
    assert resp.status_code == 200
    data = resp.json()
    assert "source" in data
    assert "status" in data
    assert "alerts" in data
