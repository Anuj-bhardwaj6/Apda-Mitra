from __future__ import annotations

from unittest.mock import MagicMock, patch
import pytest

from ai.config import NER_BBOX, NER_STATES, OPEN_METEO_BASE_URL


def test_ner_bounding_box_constants():
    """Validates NER India geographic bounds."""
    min_lon, min_lat, max_lon, max_lat = NER_BBOX[0], NER_BBOX[1], NER_BBOX[2], NER_BBOX[3]

    assert 20.0 <= min_lat < max_lat <= 30.0
    assert 87.0 <= min_lon < max_lon <= 98.0
    assert len(NER_STATES) >= 8
    assert "Sikkim" in NER_STATES
    assert "Assam" in NER_STATES


def test_openmeteo_weather_downloader_fallback():
    """Verifies that Open-Meteo downloader handles request timeouts gracefully."""
    from ai.scripts.features.weather import fetch_live_weather

    with patch("requests.get") as mock_get:
        mock_get.side_effect = Exception("Connection refused")
        res = fetch_live_weather(27.33, 88.61)

        assert isinstance(res, dict)
        assert "rainfall_24h" in res
        assert "temperature" in res
        assert "humidity" in res
        assert res["rainfall_24h"] >= 0.0


def test_soil_moisture_downloader_fallback():
    """Verifies that soil moisture fetcher returns valid fallback boundaries."""
    from ai.scripts.features.soil import fetch_live_soil_moisture

    with patch("requests.get") as mock_get:
        mock_get.side_effect = Exception("Timeout")
        res = fetch_live_soil_moisture(27.33, 88.61)

        assert "soil_moisture_surface" in res
        assert "soil_moisture_10cm" in res
        assert 0.0 <= res["soil_moisture_surface"] <= 1.0


def test_worldcover_downloader_classes():
    """Verifies NDVI proxy mappings for ESA WorldCover classes."""
    from ai.scripts.features.satellite import NDVI_PROXY_MAP, get_satellite_features

    assert 10 in NDVI_PROXY_MAP  # Tree cover
    assert 50 in NDVI_PROXY_MAP  # Built-up
    res = get_satellite_features(27.33, 88.61)
    assert "land_cover_class" in res
    assert "ndvi_proxy" in res
