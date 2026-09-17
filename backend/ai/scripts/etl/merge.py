"""
ETL — Dataset Merge Pipeline
==============================
Merges all cleaned data sources into a single training-ready dataset:
  1. NASA GLC landslide events (positive samples, label=1)
  2. Synthetic negative samples (no-landslide, label=0) from background grid
  3. Weather features (from Open-Meteo)
  4. Soil moisture (from SMAP / Open-Meteo)
  5. Terrain features (from SRTM DEM — extracted here via feature modules)
  6. Land cover (from ESA WorldCover)
  7. OSM proximity features (river/road distances)
  8. Historical landslide density (KDE)
  9. Temporal features (month, season)

Output:
    datasets/processed/merged_training.parquet
    datasets/training/training_dataset.parquet   — final for model training
    datasets/training/training_dataset.csv        — CSV backup
    datasets/training/training_dataset.geoparquet — GeoParquet with geometry
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    FEATURE_COLUMNS,
    METADATA_DIR,
    NEGATIVE_SAMPLE_MIN_DIST_DEG,
    NEGATIVE_SAMPLE_RATIO,
    NER_BBOX,
    PROCESSED_DIR,
    RAW_DIR,
    TARGET_COLUMN,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("etl.merge")


def _load_processed(filename: str) -> Optional[pd.DataFrame]:
    path = PROCESSED_DIR / filename
    if path.exists():
        return pd.read_parquet(path)
    log.warning("Processed file not found, skipping", file=filename)
    return None


def _generate_negative_samples(
    positive_df: pd.DataFrame,
    ratio: int = NEGATIVE_SAMPLE_RATIO,
) -> pd.DataFrame:
    """
    Generates negative (no-landslide) samples by stratified spatial sampling
    within NER bbox, ensuring minimum distance from known positive sites.

    Strategy:
    - Sample candidate points from a uniform grid
    - Reject candidates within NEGATIVE_SAMPLE_MIN_DIST_DEG of any positive
    - Sample `ratio` negatives per positive
    """
    np.random.seed(42)
    n_positive = len(positive_df)
    n_needed = n_positive * ratio
    min_lon, min_lat, max_lon, max_lat = NER_BBOX

    positive_coords = positive_df[["latitude", "longitude"]].values

    candidates: list[dict] = []
    batch_size = n_needed * 10  # Over-sample to account for rejection

    log.info("Generating negative samples", n_needed=n_needed)

    attempt = 0
    max_attempts = 10
    while len(candidates) < n_needed and attempt < max_attempts:
        lats = np.random.uniform(min_lat, max_lat, batch_size)
        lons = np.random.uniform(min_lon, max_lon, batch_size)

        for lat, lon in zip(lats, lons):
            if len(candidates) >= n_needed:
                break
            # Check minimum distance from all positive samples
            dists = np.sqrt(
                (positive_coords[:, 0] - lat) ** 2
                + (positive_coords[:, 1] - lon) ** 2
            )
            if dists.min() >= NEGATIVE_SAMPLE_MIN_DIST_DEG:
                candidates.append({"latitude": lat, "longitude": lon})

        attempt += 1

    neg_df = pd.DataFrame(candidates[:n_needed])
    neg_df[TARGET_COLUMN] = 0
    neg_df["data_source"] = "SYNTHETIC_NEGATIVE"

    # Assign a random historical date for weather lookups
    pos_dates = pd.to_datetime(positive_df["event_date"], errors="coerce").dropna()
    if len(pos_dates) > 0:
        min_date = pos_dates.min()
        max_date = pos_dates.max()
        random_ts = pd.to_timedelta(
            np.random.uniform(0, (max_date - min_date).days, len(neg_df)),
            unit="D"
        )
        neg_df["event_date"] = (min_date + random_ts).dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        neg_df["event_date"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    log.info("Negative samples generated", n=len(neg_df))
    return neg_df


def _merge_weather(base_df: pd.DataFrame, weather_df: Optional[pd.DataFrame]) -> pd.DataFrame:
    """
    Merges weather features into base_df using spatial nearest-neighbor join
    (matching on lat/lon rounded to 2 decimal places).
    """
    if weather_df is None or len(weather_df) == 0:
        log.warning("No weather data — filling with NaN")
        for col in ["rainfall_24h", "rainfall_72h", "rainfall_7d", "humidity",
                    "temperature", "wind_speed", "pressure"]:
            base_df[col] = np.nan
        return base_df

    weather_cols = ["latitude", "longitude", "rainfall_24h", "rainfall_72h",
                    "rainfall_7d", "humidity", "temperature", "wind_speed", "pressure"]
    available = [c for c in weather_cols if c in weather_df.columns]
    weather_sub = weather_df[available].copy()
    weather_sub["_lat_r"] = weather_sub["latitude"].round(2)
    weather_sub["_lon_r"] = weather_sub["longitude"].round(2)

    base_df["_lat_r"] = base_df["latitude"].round(2)
    base_df["_lon_r"] = base_df["longitude"].round(2)

    merged = base_df.merge(
        weather_sub.drop(columns=["latitude", "longitude"]),
        on=["_lat_r", "_lon_r"],
        how="left",
    )
    merged = merged.drop(columns=["_lat_r", "_lon_r"])
    log.info("Weather merged", matched_rows=merged["rainfall_24h"].notna().sum())
    return merged


def _merge_soil(base_df: pd.DataFrame, soil_df: Optional[pd.DataFrame]) -> pd.DataFrame:
    """Merges soil moisture features using lat/lon nearest join."""
    if soil_df is None or len(soil_df) == 0:
        base_df["soil_moisture_surface"] = np.nan
        base_df["soil_moisture_10cm"] = np.nan
        return base_df

    soil_cols = ["latitude", "longitude", "soil_moisture_surface", "soil_moisture_10cm"]
    available = [c for c in soil_cols if c in soil_df.columns]
    soil_sub = soil_df[available].copy()
    soil_sub["_lat_r"] = soil_sub["latitude"].round(2)
    soil_sub["_lon_r"] = soil_sub["longitude"].round(2)

    base_df["_lat_r"] = base_df["latitude"].round(2)
    base_df["_lon_r"] = base_df["longitude"].round(2)

    merged = base_df.merge(
        soil_sub.drop(columns=["latitude", "longitude"]),
        on=["_lat_r", "_lon_r"],
        how="left",
    )
    merged = merged.drop(columns=["_lat_r", "_lon_r"])
    return merged


def _add_terrain_features(df: pd.DataFrame) -> pd.DataFrame:
    """Extracts terrain features from SRTM for each point."""
    try:
        sys.path.insert(0, str(Path(__file__).parents[1]))
        from features.terrain import extract_terrain_features_batch
        df = extract_terrain_features_batch(df)
        log.info("Terrain features added")
    except Exception as exc:
        log.warning("Terrain feature extraction failed, using defaults", error=str(exc))
        df["elevation"] = 500.0
        df["slope"] = 15.0
        df["aspect"] = 180.0
        df["curvature"] = 0.0
        df["topographic_wetness_index"] = 8.0
    return df


def _add_land_cover(df: pd.DataFrame) -> pd.DataFrame:
    """Adds ESA WorldCover land cover class and NDVI proxy."""
    try:
        from scripts.download.download_worldcover import extract_land_cover_at_points
        df = extract_land_cover_at_points(df)
        log.info("Land cover features added")
    except Exception as exc:
        log.warning("Land cover extraction failed, using defaults", error=str(exc))
        df["land_cover_class"] = 40
        df["ndvi_proxy"] = 0.35
    return df


def _add_osm_distances(df: pd.DataFrame) -> pd.DataFrame:
    """Adds distance-to-river and distance-to-road features."""
    try:
        from scripts.download.download_osm import compute_distances_to_network, RIVERS_PATH, ROADS_PATH
        df = compute_distances_to_network(df, RIVERS_PATH, "distance_to_river_m")
        df = compute_distances_to_network(df, ROADS_PATH, "distance_to_road_m")
        log.info("OSM distance features added")
    except Exception as exc:
        log.warning("OSM distance computation failed, using defaults", error=str(exc))
        df["distance_to_river_m"] = 5000.0
        df["distance_to_road_m"] = 2000.0
    return df


def _add_historical_density(df: pd.DataFrame, positive_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes kernel density estimation of historical landslide events
    within a 25km radius for each sample point.
    """
    try:
        from scipy.stats import gaussian_kde
        if len(positive_df) < 5:
            df["historical_landslide_density"] = 0.0
            df["citizen_report_density"] = 0.0
            return df

        pos_lats = positive_df["latitude"].values
        pos_lons = positive_df["longitude"].values
        kde = gaussian_kde(np.vstack([pos_lats, pos_lons]), bw_method=0.1)

        sample_points = np.vstack([df["latitude"].values, df["longitude"].values])
        df["historical_landslide_density"] = kde(sample_points)
        # Normalize to [0, 1] range
        max_density = df["historical_landslide_density"].max()
        if max_density > 0:
            df["historical_landslide_density"] /= max_density

        # Citizen report density: placeholder (populated from live DB at inference)
        df["citizen_report_density"] = 0.0
        log.info("Historical density features added")
    except Exception as exc:
        log.warning("Historical density failed", error=str(exc))
        df["historical_landslide_density"] = 0.0
        df["citizen_report_density"] = 0.0
    return df


def _add_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    """Adds cyclically encoded month, season."""
    if "event_date" in df.columns:
        dates = pd.to_datetime(df["event_date"], errors="coerce", utc=True)
        df["month"] = dates.dt.month.fillna(6).astype(int)
    else:
        df["month"] = 6

    # Cyclical encoding
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    # Season (India meteorological seasons)
    def month_to_season(m: int) -> int:
        if m in [3, 4, 5]:
            return 1   # Pre-monsoon (MAM)
        elif m in [6, 7, 8, 9]:
            return 2   # Monsoon (JJAS) — peak landslide season
        elif m in [10, 11]:
            return 3   # Post-monsoon (ON)
        else:
            return 0   # Winter (DJF)

    df["season"] = df["month"].apply(month_to_season)
    return df


def merge(force: bool = False) -> pd.DataFrame:
    """
    Main merge pipeline: combines all datasets into a training-ready DataFrame.
    """
    output_path = PROCESSED_DIR / "merged_training.parquet"
    if output_path.exists() and not force:
        log.info("Loading merged dataset from cache", path=str(output_path))
        return pd.read_parquet(output_path)

    log.info("=== MERGE PIPELINE START ===")

    # Load positive samples
    glc_df = _load_processed("nasa_glc_clean.parquet")
    if glc_df is None or len(glc_df) == 0:
        raise RuntimeError("No landslide events found. Run ETL clean pipeline first.")

    glc_df[TARGET_COLUMN] = 1

    # Generate negative samples
    neg_df = _generate_negative_samples(glc_df)

    # Combine positive + negative
    base_df = pd.concat([glc_df, neg_df], ignore_index=True)
    log.info("Base dataset assembled", total=len(base_df), positive=len(glc_df), negative=len(neg_df))

    # Load weather & soil
    weather_df = _load_processed("weather_clean.parquet")
    soil_df = _load_processed("soil_clean.parquet")

    # Merge features
    base_df = _merge_weather(base_df, weather_df)
    base_df = _merge_soil(base_df, soil_df)
    base_df = _add_terrain_features(base_df)
    base_df = _add_land_cover(base_df)
    base_df = _add_osm_distances(base_df)
    base_df = _add_historical_density(base_df, glc_df)
    base_df = _add_temporal_features(base_df)

    # Ensure target column is integer
    base_df[TARGET_COLUMN] = base_df[TARGET_COLUMN].fillna(0).astype(int)

    # Save processed version
    base_df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Merged dataset saved", path=str(output_path), rows=len(base_df))

    # Save training versions
    _save_training_datasets(base_df)
    return base_df


def _save_training_datasets(df: pd.DataFrame) -> None:
    """Saves final training dataset in multiple formats."""
    # Select only feature columns + target that exist
    available_features = [c for c in FEATURE_COLUMNS if c in df.columns]
    train_cols = available_features + [TARGET_COLUMN, "latitude", "longitude", "event_date"]
    train_cols = list(dict.fromkeys(train_cols))  # deduplicate preserving order
    available_train_cols = [c for c in train_cols if c in df.columns]
    train_df = df[available_train_cols].copy()

    # Parquet
    parquet_path = TRAINING_DIR / "training_dataset.parquet"
    train_df.to_parquet(parquet_path, index=False, engine="pyarrow")
    log.info("Training Parquet saved", path=str(parquet_path))

    # CSV
    csv_path = TRAINING_DIR / "training_dataset.csv"
    train_df.to_csv(csv_path, index=False)
    log.info("Training CSV saved", path=str(csv_path))

    # GeoParquet (requires geopandas)
    try:
        import geopandas as gpd
        from shapely.geometry import Point
        gdf = gpd.GeoDataFrame(
            train_df,
            geometry=[Point(row.longitude, row.latitude) for _, row in train_df.iterrows()],
            crs="EPSG:4326",
        )
        geo_path = TRAINING_DIR / "training_dataset.geoparquet"
        gdf.to_parquet(str(geo_path), index=False)
        log.info("GeoParquet saved", path=str(geo_path))
    except Exception as exc:
        log.warning("GeoParquet save failed", error=str(exc))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run ETL merge pipeline")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    df = merge(force=args.force)
    print(f"\n✅ Merged dataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"   Positive (landslide=1): {(df[TARGET_COLUMN]==1).sum()}")
    print(f"   Negative (landslide=0): {(df[TARGET_COLUMN]==0).sum()}")
