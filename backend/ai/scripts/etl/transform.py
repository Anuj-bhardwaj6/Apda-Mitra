"""
ETL — Feature Transformation Pipeline
========================================
Applies feature engineering transformations to the merged dataset
before model training:
  - Log-transform for skewed rainfall features
  - StandardScaler fitting and application
  - One-hot encoding for land_cover_class, season
  - Cyclical encoding validation (month_sin, month_cos already computed)
  - Final feature matrix assembly in canonical FEATURE_COLUMNS order

Saves:
    datasets/models/latest/scaler.joblib         — fitted StandardScaler
    datasets/training/training_dataset_scaled.parquet
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    FEATURE_COLUMNS,
    LATEST_MODEL_DIR,
    METADATA_DIR,
    SCALER_FILENAME,
    TARGET_COLUMN,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("etl.transform")

SCALER_PATH = LATEST_MODEL_DIR / SCALER_FILENAME

# Features to log-transform (right-skewed rainfall distributions)
LOG_TRANSFORM_COLS = ["rainfall_24h", "rainfall_72h", "rainfall_7d", "distance_to_river_m", "distance_to_road_m"]

# Continuous features to standardize (z-score)
SCALE_COLS = [
    "latitude", "longitude", "elevation", "slope", "aspect", "curvature",
    "topographic_wetness_index", "rainfall_24h", "rainfall_72h", "rainfall_7d",
    "humidity", "temperature", "wind_speed", "pressure",
    "soil_moisture_surface", "soil_moisture_10cm", "ndvi_proxy",
    "distance_to_river_m", "distance_to_road_m",
    "historical_landslide_density", "citizen_report_density",
    "month_sin", "month_cos",
]


def apply_log_transform(df: pd.DataFrame) -> pd.DataFrame:
    """Log1p transform for skewed features (avoids log(0) issues)."""
    for col in LOG_TRANSFORM_COLS:
        if col in df.columns:
            df[col] = np.log1p(df[col].clip(lower=0))
            log.debug("Log-transformed", col=col)
    return df


def fit_and_apply_scaler(
    df: pd.DataFrame,
    fit: bool = True,
    scaler_path: Path = SCALER_PATH,
) -> tuple[pd.DataFrame, StandardScaler]:
    """
    Fits StandardScaler on continuous features (if fit=True) or loads existing scaler.
    Applies z-score normalization to the continuous feature columns.
    """
    scale_cols = [c for c in SCALE_COLS if c in df.columns]

    if fit:
        scaler = StandardScaler()
        df[scale_cols] = scaler.fit_transform(df[scale_cols])
        joblib.dump(scaler, scaler_path)
        log.info("Scaler fitted and saved", path=str(scaler_path), n_features=len(scale_cols))
    else:
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler not found at {scaler_path}. Run training first.")
        scaler = joblib.load(scaler_path)
        df[scale_cols] = scaler.transform(df[scale_cols])
        log.info("Existing scaler applied", path=str(scaler_path))

    return df, scaler


def encode_categorical(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encodes categorical features:
    - land_cover_class: kept as integer (ordinal encoding implicit in tree models)
    - season: kept as integer [0,1,2,3]
    XGBoost tree models handle integer categoricals natively without OHE.
    """
    if "land_cover_class" in df.columns:
        df["land_cover_class"] = df["land_cover_class"].fillna(40).astype(int)
    if "season" in df.columns:
        df["season"] = df["season"].fillna(2).astype(int)
    return df


def assemble_feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """
    Returns X (feature matrix) and y (target vector) in canonical column order.
    Only includes features that exist in the DataFrame.
    """
    available_features = [c for c in FEATURE_COLUMNS if c in df.columns]
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]

    if missing:
        log.warning("Missing features in dataset", features=missing)
        for col in missing:
            df[col] = 0.0

    X = df[FEATURE_COLUMNS].copy()
    y = df[TARGET_COLUMN].astype(int) if TARGET_COLUMN in df.columns else pd.Series(dtype=int)

    log.info("Feature matrix assembled", n_features=len(FEATURE_COLUMNS), n_samples=len(X))
    return X, y


def transform(input_path: Path = None, fit_scaler: bool = True, force: bool = False) -> tuple[pd.DataFrame, pd.Series]:
    """
    Main entry point: runs the full transformation pipeline.

    Args:
        input_path: Path to merged training Parquet (default: training/training_dataset.parquet)
        fit_scaler: If True, fits a new scaler. If False, loads existing.
        force: Re-transform even if output exists.

    Returns:
        (X, y) — feature matrix and target vector.
    """
    if input_path is None:
        input_path = TRAINING_DIR / "training_dataset.parquet"

    output_path = TRAINING_DIR / "training_dataset_scaled.parquet"

    if output_path.exists() and not force and fit_scaler:
        log.info("Loading transformed dataset from cache")
        df = pd.read_parquet(output_path)
        X, y = assemble_feature_matrix(df)
        return X, y

    if not input_path.exists():
        raise FileNotFoundError(f"Training dataset not found: {input_path}. Run merge.py first.")

    log.info("=== TRANSFORM PIPELINE START ===", input=str(input_path))
    df = pd.read_parquet(input_path)

    df = apply_log_transform(df)
    df = encode_categorical(df)

    if fit_scaler:
        df, scaler = fit_and_apply_scaler(df, fit=True)
    else:
        df, scaler = fit_and_apply_scaler(df, fit=False)

    # Fill any remaining NaN with 0 (post-transform safety)
    feature_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
    df[feature_cols] = df[feature_cols].fillna(0)

    # Save scaled dataset
    df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Scaled dataset saved", path=str(output_path), rows=len(df))

    X, y = assemble_feature_matrix(df)
    log.info("=== TRANSFORM PIPELINE COMPLETE ===",
             n_features=X.shape[1], n_samples=len(X),
             positive_rate=f"{y.mean()*100:.1f}%")
    return X, y


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run ETL transform pipeline")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--no-fit", action="store_true", help="Load existing scaler instead of fitting new one")
    args = parser.parse_args()

    X, y = transform(fit_scaler=not args.no_fit, force=args.force)
    print(f"\n✅ Feature matrix: {X.shape}")
    print(f"   Positive rate: {y.mean()*100:.1f}%")
    print(f"\nFeature columns ({len(X.columns)}):")
    for col in X.columns:
        print(f"  - {col}")
