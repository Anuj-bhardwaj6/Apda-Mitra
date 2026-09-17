"""
Comprehensive 10-State Regional Architecture Verification Test
Verifies that all 10 states:
1. Himachal Pradesh
2. Uttarakhand
3. Sikkim
4. Arunachal Pradesh
5. Assam
6. Meghalaya
7. Nagaland
8. Manipur
9. Mizoram
10. Tripura
can be queried individually and in regional aggregate without fake telemetry.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.region_config import TARGET_STATES

client = TestClient(app)

TARGET_STATE_SLUGS = [
    "himachal-pradesh",
    "uttarakhand",
    "sikkim",
    "arunachal-pradesh",
    "assam",
    "meghalaya",
    "nagaland",
    "manipur",
    "mizoram",
    "tripura"
]


def test_all_10_states_present_in_registry():
    response = client.get("/api/states")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 10
    slugs = [s["slug"] for s in data["states"]]
    for expected in TARGET_STATE_SLUGS:
        assert expected in slugs, f"Missing target state {expected} in registry"


def test_regional_overview_contract():
    response = client.get("/api/region/overview")
    assert response.status_code == 200
    data = response.json()
    assert data["region"] == "APDA MITRA TARGET REGION"
    assert data["states_monitored"] == 10
    assert "counts" in data
    counts = data["counts"]
    for key in ["high_risk", "moderate_risk", "low_risk", "data_unavailable"]:
        assert key in counts
        assert isinstance(counts[key], int)

    # State risk overview table must have all 10 states
    assert len(data["states"]) == 10
    for st in data["states"]:
        assert st["data_status"] in ["LIVE", "STALE", "ERROR", "UNAVAILABLE"]
        assert st["nasa_hazard_status"] in ["HIGH", "MODERATE", "LOW", "UNAVAILABLE"]
        assert st["ai_status"] in ["AVAILABLE", "MODEL NOT AVAILABLE"]
        assert "last_updated" in st


@pytest.mark.parametrize("slug", TARGET_STATE_SLUGS)
def test_individual_state_details_and_districts(slug: str):
    # 1. State details
    resp_details = client.get(f"/api/states/{slug}")
    assert resp_details.status_code == 200
    state_data = resp_details.json()
    assert state_data["slug"] == slug
    assert "centroid" in state_data
    assert len(state_data["centroid"]) == 2
    assert "bbox" in state_data
    assert "min_lat" in state_data["bbox"]

    # 2. Districts
    resp_districts = client.get(f"/api/states/{slug}/districts")
    assert resp_districts.status_code == 200
    dist_data = resp_districts.json()
    assert dist_data["count"] > 0
    assert len(dist_data["districts"]) > 0


@pytest.mark.parametrize("slug", TARGET_STATE_SLUGS)
def test_individual_state_landslides(slug: str):
    # Each state must query real events from NASA COOLR
    resp_events = client.get(f"/api/landslides/state/{slug}?limit=10")
    assert resp_events.status_code == 200
    events_data = resp_events.json()
    assert "NASA COOLR" in events_data["source"]
    assert "events" in events_data
    assert events_data["count"] > 0
    for evt in events_data["events"]:
        assert "NASA COOLR" in evt["source"]


def test_regional_coolr_events():
    # Regional query covering entire 10-state bounding box
    resp_region = client.get("/api/landslides/region?limit=50")
    assert resp_region.status_code == 200
    data = resp_region.json()
    assert "NASA COOLR" in data["source"]
    assert data["count"] > 0
    assert len(data["events"]) > 0


def test_zero_fake_probabilities_on_predict():
    payload = {
        "latitude": 31.1048,
        "longitude": 77.1734
    }
    resp = client.post("/api/risk/predict", json=payload)
    assert resp.status_code == 200
    res = resp.json()
    if res["status"] == "model_unavailable":
        assert res["risk_probability"] is None
        assert res["risk_level"] == "MODEL NOT AVAILABLE"
    elif res["status"] == "missing_features":
        assert res["risk_probability"] is None
    elif res["status"] == "available":
        assert res["risk_probability"] is not None
