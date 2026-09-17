from __future__ import annotations

import pytest
from datetime import datetime

from ai.config import FEATURE_COLUMNS
from ai.scripts.training.predict import assemble_features_for_point, compute_temporal_features


def test_canonical_features_list():
    """Ensures feature columns list contains all required input keys."""
    assert len(FEATURE_COLUMNS) == 25
    assert "latitude" in FEATURE_COLUMNS
    assert "longitude" in FEATURE_COLUMNS
    assert "slope" in FEATURE_COLUMNS
    assert "rainfall_24h" in FEATURE_COLUMNS
    assert "rainfall_72h" in FEATURE_COLUMNS
    assert "soil_moisture_surface" in FEATURE_COLUMNS
    assert "distance_to_river_m" in FEATURE_COLUMNS
    assert "historical_landslide_density" in FEATURE_COLUMNS
    assert "season" in FEATURE_COLUMNS


def test_temporal_feature_generation():
    """Verifies cyclical month encoding and monsoon classification."""
    # July (Monsoon)
    july_dt = datetime(2026, 7, 15)
    feats_july = compute_temporal_features(july_dt)
    assert feats_july["season"] == 3.0
    assert -1.0 <= feats_july["month_sin"] <= 1.0
    assert -1.0 <= feats_july["month_cos"] <= 1.0

    # January (Winter)
    jan_dt = datetime(2026, 1, 15)
    feats_jan = compute_temporal_features(jan_dt)
    assert feats_jan["season"] == 1.0


def test_feature_assembly_integrity():
    """Ensures assemble_features_for_point outputs exactly FEATURE_COLUMNS with non-null floats."""
    lat, lon = 27.3389, 88.6065  # Gangtok
    overrides = {
        "rainfall_24h": 45.0,
        "slope": 28.5,
    }
    feats = assemble_features_for_point(lat, lon, overrides=overrides)

    assert len(feats) == len(FEATURE_COLUMNS)
    for col in FEATURE_COLUMNS:
        assert col in feats
        val = feats[col]
        assert isinstance(val, (float, int))
        assert not isinstance(val, bool)

    assert feats["rainfall_24h"] == 45.0
    assert feats["slope"] == 28.5
    assert feats["latitude"] == lat
    assert feats["longitude"] == lon
