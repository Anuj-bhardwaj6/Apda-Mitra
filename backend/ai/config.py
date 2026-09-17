"""
APDA MITRA — AI Subsystem Configuration
Centralizes all paths, constants, and tunable parameters for the Landslide
Early Warning & Risk Prediction Engine.

All paths are relative to the `backend/` directory root to allow Docker-mount
portability without environment fragility.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Final, List

# ---------------------------------------------------------------------------
# Root Paths
# ---------------------------------------------------------------------------
# The canonical root of the AI subsystem (backend/ai/)
AI_ROOT: Final[Path] = Path(__file__).parent.resolve()
BACKEND_ROOT: Final[Path] = AI_ROOT.parent

# ---------------------------------------------------------------------------
# Dataset Paths
# ---------------------------------------------------------------------------
DATASETS_DIR: Final[Path] = AI_ROOT / "datasets"
RAW_DIR: Final[Path] = DATASETS_DIR / "raw"
PROCESSED_DIR: Final[Path] = DATASETS_DIR / "processed"
TRAINING_DIR: Final[Path] = DATASETS_DIR / "training"
ARTIFACTS_DIR: Final[Path] = DATASETS_DIR / "artifacts"
MODELS_DIR: Final[Path] = DATASETS_DIR / "models"
METADATA_DIR: Final[Path] = DATASETS_DIR / "metadata"

# Ensure directories exist at import time
for _d in [RAW_DIR, PROCESSED_DIR, TRAINING_DIR, ARTIFACTS_DIR, MODELS_DIR, METADATA_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Model Versioning
# ---------------------------------------------------------------------------
LATEST_MODEL_DIR: Final[Path] = MODELS_DIR / "latest"
LATEST_MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_FILENAME: Final[str] = "model.joblib"
SCALER_FILENAME: Final[str] = "scaler.joblib"
FEATURE_LIST_FILENAME: Final[str] = "feature_list.json"
METRICS_FILENAME: Final[str] = "metrics.json"
TRAINING_CONFIG_FILENAME: Final[str] = "training_config.json"
MODEL_MANIFEST_FILENAME: Final[str] = "model_manifest.json"

# ---------------------------------------------------------------------------
# MLflow
# ---------------------------------------------------------------------------
MLFLOW_TRACKING_URI: Final[str] = os.getenv(
    "MLFLOW_TRACKING_URI",
    f"file:///{(AI_ROOT / 'mlruns').as_posix()}"
)
MLFLOW_EXPERIMENT_NAME: Final[str] = "apda_mitra_landslide_ner"

# ---------------------------------------------------------------------------
# Geospatial Constants — North Eastern Region of India
# ---------------------------------------------------------------------------
# Bounding box: [min_lon, min_lat, max_lon, max_lat]
NER_BBOX: Final[List[float]] = [87.5, 20.0, 97.5, 29.5]
NER_STATES: Final[List[str]] = [
    "Assam", "Meghalaya", "Manipur", "Mizoram",
    "Nagaland", "Sikkim", "Arunachal Pradesh", "Tripura",
    # Also include adjacent high-risk areas
    "West Bengal",  # Darjeeling hills
]
INDIA_BBOX: Final[List[float]] = [68.1, 6.5, 97.4, 35.5]
CRS_WGS84: Final[str] = "EPSG:4326"
CRS_MERCATOR: Final[str] = "EPSG:3857"

# ---------------------------------------------------------------------------
# SRTM DEM Tile Configuration
# ---------------------------------------------------------------------------
# NER tiles (SRTM 30m): latitude 20-30N, longitude 88-98E
# Tiles are identified by lower-left corner
SRTM_TILES: Final[List[str]] = [
    "N20E088", "N20E089", "N20E090", "N20E091", "N20E092", "N20E093",
    "N20E094", "N20E095", "N20E096", "N20E097",
    "N21E088", "N21E089", "N21E090", "N21E091", "N21E092", "N21E093",
    "N21E094", "N21E095", "N21E096", "N21E097",
    "N22E088", "N22E089", "N22E090", "N22E091", "N22E092", "N22E093",
    "N22E094", "N22E095", "N22E096", "N22E097",
    "N23E088", "N23E089", "N23E090", "N23E091", "N23E092", "N23E093",
    "N23E094", "N23E095", "N23E096", "N23E097",
    "N24E088", "N24E089", "N24E090", "N24E091", "N24E092", "N24E093",
    "N24E094", "N24E095", "N24E096", "N24E097",
    "N25E088", "N25E089", "N25E090", "N25E091", "N25E092", "N25E093",
    "N25E094", "N25E095", "N25E096",
    "N26E088", "N26E089", "N26E090", "N26E091", "N26E092", "N26E093",
    "N26E094", "N26E095", "N26E096",
    "N27E088", "N27E089", "N27E090", "N27E091", "N27E092", "N27E093",
    "N27E094", "N27E095", "N27E096",
    "N28E088", "N28E089", "N28E090", "N28E091", "N28E092", "N28E093",
    "N28E094", "N28E095",
    "N29E088", "N29E089", "N29E090", "N29E091", "N29E092", "N29E093",
    "N29E094", "N29E095",
]

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Feature Engineering — Apda Mitra 4 Pillars
# ---------------------------------------------------------------------------
# Four Authoritative Pillars:
# 1. NASA COOLR (Landslide Ground Truth Events)
# 2. NASA GPM IMERG (Satellite Precipitation)
# 3. NASA/USDA SMAP (Volumetric Soil Moisture)
# 4. Copernicus GLO-30 (30m DEM Elevation & Slope)
FEATURE_COLUMNS_V1: Final[List[str]] = [
    # Copernicus GLO-30
    "copernicus_elevation_m",
    "copernicus_slope_deg",
    "copernicus_aspect_deg",
    "copernicus_plan_curvature",
    "copernicus_profile_curvature",
    "copernicus_twi",
    # NASA GPM IMERG
    "gpm_imerg_rainfall_1d_mm",
    "gpm_imerg_rainfall_3d_mm",
    "gpm_imerg_rainfall_7d_mm",
    "gpm_imerg_peak_intensity_mm_h",
    # NASA/USDA SMAP
    "smap_surface_moisture_m3m3",
    "smap_rootzone_moisture_m3m3",
    "smap_soil_saturation_ratio",
]

# Active production feature columns (Dataset v1 4 Pillars)
FEATURE_COLUMNS: Final[List[str]] = FEATURE_COLUMNS_V1

TARGET_COLUMN: Final[str] = "landslide"

# ---------------------------------------------------------------------------
# Training Hyperparameters (defaults — overridden by Optuna best params)
# ---------------------------------------------------------------------------
DEFAULT_XGB_PARAMS: Final[dict] = {
    "objective": "binary:logistic",
    "eval_metric": "aucpr",
    "tree_method": "hist",
    "device": os.getenv("USE_GPU", "false").lower() == "true" and "cuda" or "cpu",
    "n_estimators": 500,
    "max_depth": 6,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
    "verbosity": 0,
}

TRAIN_TEST_VAL_SPLIT: Final[tuple] = (0.70, 0.15, 0.15)
N_CV_FOLDS: Final[int] = 5
EARLY_STOPPING_ROUNDS: Final[int] = 50
OPTUNA_N_TRIALS: Final[int] = 100
OPTUNA_TIMEOUT_SECONDS: Final[int] = 3600  # 1 hour max

# ---------------------------------------------------------------------------
# Risk Level Thresholds (calibrated probabilities)
# ---------------------------------------------------------------------------
RISK_THRESHOLDS: Final[dict] = {
    "LOW": (0.0, 0.30),
    "MODERATE": (0.30, 0.55),
    "HIGH": (0.55, 0.75),
    "VERY_HIGH": (0.75, 0.90),
    "CRITICAL": (0.90, 1.01),
}

# ---------------------------------------------------------------------------
# Retraining / Continuous Learning
# ---------------------------------------------------------------------------
RETRAIN_MIN_SAMPLES: Final[int] = int(os.getenv("RETRAIN_MIN_SAMPLES", "50"))
ROLLBACK_METRIC_TOLERANCE: Final[float] = 0.02  # Allow 2% AUC drop before rollback

# ---------------------------------------------------------------------------
# External APIs
# ---------------------------------------------------------------------------
OPEN_METEO_BASE_URL: Final[str] = "https://archive-api.open-meteo.com/v1/archive"
OPEN_METEO_FORECAST_URL: Final[str] = "https://api.open-meteo.com/v1/forecast"
NASA_GLC_CSV_URL: Final[str] = "https://maps.nccs.nasa.gov/arcgis/rest/services/COOLR/COOLR_Events/MapServer/0/query?where=1%3D1&outFields=*&f=csv"
OVERPASS_API_URL: Final[str] = "https://overpass-api.de/api/interpreter"
ESA_WORLDCOVER_BASE_URL: Final[str] = "https://esa-worldcover.s3.amazonaws.com/v200/2021/map"

# ---------------------------------------------------------------------------
# Negative Sample Generation
# ---------------------------------------------------------------------------
# Ratio of negative (no-landslide) samples to positive (landslide) samples
NEGATIVE_SAMPLE_RATIO: Final[int] = 3
# Minimum distance from known landslide sites for negative samples (degrees ~11km)
NEGATIVE_SAMPLE_MIN_DIST_DEG: Final[float] = 0.1
