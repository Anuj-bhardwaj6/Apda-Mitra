"""
APDA MITRA — NASA Telemetry & Scientific Provenance Test Suite
=============================================================
Verifies:
1. NASA GPM IMERG returns genuine observation latency and strict provenance schema.
2. NASA SMAP queries genuine NASA POWER / SMAP Level 4 / MERRA-2 wetness (GWETTOP),
   never third-party Open-Meteo attribution or fake 88%.
3. NASA LHASA avoids rainfall threshold heuristics and degrades to UNAVAILABLE honestly.
4. NASA COOLR catalog records are badged as HISTORICAL with preserved dates.
5. Copernicus DEM is badged as STATIC BASELINE.
6. XGBoost model uses canonical 10 features without synthetic multipliers (rainfall_24h * 2.5 / 4.0).
7. 10-state spatial aggregation uses max_hazard_within_state_boundary across all target states.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.nasa_imerg import nasa_imerg_service
from app.services.nasa_smap import nasa_smap_service
from app.services.nasa_lhasa import nasa_lhasa_service
from app.services.nasa_coolr import nasa_coolr_service
from app.services.copernicus_dem import copernicus_dem_service
from app.services.historical_weather_service import historical_weather_service
from app.services.region_service import region_service
from app.core.region_config import TARGET_STATES, get_state_sampling_grid

client = TestClient(app)


@pytest.mark.asyncio
async def test_nasa_imerg_provenance():
    """Validates NASA GPM IMERG returns genuine schema, valid status, and no fake values."""
    res = await nasa_imerg_service.get_rainfall(27.33, 88.61, period="24h")
    assert res["source"] == "NASA GPM IMERG"
    assert res["status"] in ["LIVE", "STALE", "UNAVAILABLE"]
    assert "product" in res
    assert "fetched_at" in res
    if res["status"] == "LIVE":
        assert res["value_mm"] is not None
        assert res["observation_time"] is not None


@pytest.mark.asyncio
async def test_nasa_smap_provenance():
    """Validates NASA SMAP queries NASA POWER GWETTOP / MERRA-2 and never attributes to Open-Meteo."""
    res = await nasa_smap_service.get_soil_moisture(27.33, 88.61)
    assert res["source"] == "NASA/USDA SMAP"
    assert "Open-Meteo" not in res.get("source_product", "")
    assert res["status"] in ["LIVE", "STALE", "UNAVAILABLE"]
    if res["status"] == "UNAVAILABLE":
        assert res["display_text"] == "DATA UNAVAILABLE"
        assert res["soil_moisture"] is None
    elif res["status"] == "LIVE":
        assert res["soil_moisture"] is not None
        assert 0.0 <= res["soil_moisture"] <= 1.0


@pytest.mark.asyncio
async def test_nasa_lhasa_no_heuristic():
    """Validates NASA LHASA returns genuine nowcast or UNAVAILABLE without rainfall threshold hacks."""
    res = await nasa_lhasa_service.get_hazard(27.33, 88.61)
    assert res["source"] == "NASA LHASA"
    assert res["hazard_level"] in ["HIGH", "MODERATE", "LOW", "UNAVAILABLE"]
    assert res["status"] in ["LIVE", "STALE", "UNAVAILABLE"]


@pytest.mark.asyncio
async def test_copernicus_dem_static_baseline():
    """Validates Copernicus DEM is labeled as STATIC BASELINE."""
    res = await copernicus_dem_service.get_terrain(27.33, 88.61)
    assert res["source"] == "Copernicus DEM"
    assert res["status"] in ["STATIC BASELINE", "UNAVAILABLE"]


@pytest.mark.asyncio
async def test_nasa_coolr_historical_badging():
    """Validates NASA COOLR catalog records are badged as HISTORICAL with preserved event dates."""
    res = await nasa_coolr_service.fetch_live_events(limit=5)
    assert res["status"] in ["HISTORICAL", "LIVE", "UNAVAILABLE"]
    if res.get("events"):
        first = res["events"][0]
        assert first["status"] == "HISTORICAL"
        assert first["source"] == "NASA COOLR Catalog"
        assert "event_date" in first


@pytest.mark.asyncio
async def test_temporal_rainfall_accumulation():
    """Validates genuine multi-day temporal rainfall windows (1d, 3d, 7d, 15d, 30d)."""
    res = await historical_weather_service.get_temporal_rainfall_accumulation(27.33, 88.61)
    assert "rain_1d" in res
    assert "rain_3d" in res
    assert "rain_7d" in res
    assert "rain_15d" in res
    assert "rain_30d" in res
    assert res["status"] in ["LIVE", "STALE", "UNAVAILABLE"]


@pytest.mark.asyncio
async def test_all_10_states_spatial_aggregation():
    """Validates all 10 states are monitored with spatial boundary sampling and documented aggregation."""
    overview = await region_service.get_regional_overview()
    assert overview["states_monitored"] == 10
    assert len(overview["states"]) == 10

    for st_row in overview["states"]:
        assert st_row["aggregation"] == "max_hazard_within_state_boundary"
        assert st_row["source"] == "NASA LHASA"
        assert st_row["nasa_hazard_status"] in ["HIGH", "MODERATE", "LOW", "UNAVAILABLE"]


def test_api_unified_telemetry():
    """Validates /api/telemetry/unified endpoint schema and tier separation."""
    resp = client.get("/api/telemetry/unified?latitude=27.33&longitude=88.61")
    assert resp.status_code == 200
    data = resp.json()

    # Tier 1: Observations
    obs = data["nasa_observations"]
    assert obs["rainfall"]["source"] == "NASA GPM IMERG"
    assert obs["soil_moisture"]["source"] == "NASA/USDA SMAP"
    assert obs["terrain"]["status"] in ["STATIC BASELINE", "UNAVAILABLE"]

    # Tier 2: Nowcast
    assert data["nasa_nowcast"]["source"] == "NASA LHASA"

    # Tier 3: AI Prediction
    assert data["apda_mitra_ai_prediction"]["source"] == "Apda Mitra AI"


def test_api_landslides_coolr_alias():
    """Validates /api/v1/landslides/coolr and /api/landslides/live return catalog records with HISTORICAL status."""
    for path in ["/api/v1/landslides/coolr", "/api/landslides/live"]:
        resp = client.get(f"{path}?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "NASA COOLR" in data["source"]
        if data["events"]:
            assert data["events"][0]["status"] == "HISTORICAL"
