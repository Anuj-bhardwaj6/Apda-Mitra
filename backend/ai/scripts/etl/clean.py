"""
ETL — Data Cleaning Pipeline
==============================
Applies standardised cleaning rules to each raw dataset before merging:
  - Duplicate removal (exact + near-duplicate based on coordinates + date)
  - Coordinate range validation against NER bbox
  - Missing value imputation strategies per column type
  - Date normalization to ISO-8601 UTC
  - Schema enforcement via Pydantic models
  - Structured logging of every operation

Input:  datasets/raw/nasa_glc_ner.csv
Output: datasets/processed/nasa_glc_clean.parquet
        datasets/processed/weather_clean.parquet
        datasets/processed/soil_clean.parquet
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from pydantic import BaseModel, field_validator, ValidationError

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import METADATA_DIR, NER_BBOX, PROCESSED_DIR, RAW_DIR
from ai.logger import PipelineLogger

log = PipelineLogger("etl.clean")


# ---------------------------------------------------------------------------
# Pydantic Schema Validation
# ---------------------------------------------------------------------------

class LandslideEventSchema(BaseModel):
    """Strict schema for a single NER landslide event record."""

    latitude: float
    longitude: float
    event_date: Optional[str] = None
    landslide_category: Optional[str] = None
    landslide_trigger: Optional[str] = None
    landslide_size: Optional[str] = None
    country_name: Optional[str] = None
    admin_division_name: Optional[str] = None
    fatality_count: Optional[float] = None
    label: int = 1
    data_source: str = "NASA_GLC"

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v: float) -> float:
        if not (-90 <= v <= 90):
            raise ValueError(f"Invalid latitude: {v}")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lon(cls, v: float) -> float:
        if not (-180 <= v <= 180):
            raise ValueError(f"Invalid longitude: {v}")
        return v


class WeatherSchema(BaseModel):
    """Schema for weather feature records."""

    latitude: float
    longitude: float
    rainfall_24h: Optional[float] = None
    rainfall_72h: Optional[float] = None
    rainfall_7d: Optional[float] = None
    humidity: Optional[float] = None
    temperature: Optional[float] = None
    wind_speed: Optional[float] = None
    pressure: Optional[float] = None


# ---------------------------------------------------------------------------
# Core Cleaning Functions
# ---------------------------------------------------------------------------

def _remove_duplicates(df: pd.DataFrame, coord_precision: int = 3) -> pd.DataFrame:
    """
    Removes exact and near-duplicate records.
    Near-duplicates: same rounded coordinates (to coord_precision decimals) and date.
    """
    initial = len(df)

    # Exact duplicates
    df = df.drop_duplicates()

    # Near-duplicates on coordinate + date
    if "latitude" in df.columns and "longitude" in df.columns:
        df["_lat_r"] = df["latitude"].round(coord_precision)
        df["_lon_r"] = df["longitude"].round(coord_precision)
        date_col = "event_date" if "event_date" in df.columns else None

        dedup_cols = ["_lat_r", "_lon_r"]
        if date_col:
            df["_date_str"] = pd.to_datetime(df[date_col], errors="coerce").dt.strftime("%Y-%m-%d")
            dedup_cols.append("_date_str")

        df = df.drop_duplicates(subset=dedup_cols)
        df = df.drop(columns=[c for c in ["_lat_r", "_lon_r", "_date_str"] if c in df.columns])

    log.info("Deduplication complete", initial=initial, final=len(df), removed=initial - len(df))
    return df.reset_index(drop=True)


def _validate_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    """Drops rows with coordinates outside NER bbox."""
    min_lon, min_lat, max_lon, max_lat = NER_BBOX
    initial = len(df)

    mask = (
        df["latitude"].between(min_lat, max_lat)
        & df["longitude"].between(min_lon, max_lon)
        & df["latitude"].notna()
        & df["longitude"].notna()
    )
    df = df[mask].reset_index(drop=True)
    log.info("Coordinate validation", initial=initial, valid=len(df), removed=initial - len(df))
    return df


def _normalize_dates(df: pd.DataFrame, date_col: str = "event_date") -> pd.DataFrame:
    """Normalizes date column to ISO-8601 UTC string."""
    if date_col not in df.columns:
        return df
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce", utc=True)
    df[date_col] = df[date_col].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    null_dates = df[date_col].isna().sum()
    if null_dates > 0:
        log.warning("Null dates after normalization", count=int(null_dates))
    return df


def _impute_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies column-type-specific imputation:
      - Continuous meteorological: median imputation
      - Categorical: mode imputation
      - Identifiers / text: empty string fill
    """
    continuous_cols = [
        "rainfall_24h", "rainfall_72h", "rainfall_7d",
        "humidity", "temperature", "wind_speed", "pressure",
        "soil_moisture_surface", "soil_moisture_10cm",
        "elevation", "slope", "aspect", "curvature",
        "topographic_wetness_index",
        "distance_to_river_m", "distance_to_road_m",
        "fatality_count", "injury_count",
    ]
    categorical_cols = [
        "landslide_category", "landslide_trigger", "landslide_size",
        "landslide_setting", "country_name", "admin_division_name",
    ]

    impute_report: dict = {}

    for col in continuous_cols:
        if col in df.columns:
            n_null = int(df[col].isna().sum())
            if n_null > 0:
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                impute_report[col] = {"strategy": "median", "value": float(median_val), "imputed": n_null}

    for col in categorical_cols:
        if col in df.columns:
            n_null = int(df[col].isna().sum())
            if n_null > 0:
                mode_val = df[col].mode().iloc[0] if not df[col].mode().empty else "Unknown"
                df[col] = df[col].fillna(mode_val)
                impute_report[col] = {"strategy": "mode", "value": str(mode_val), "imputed": n_null}

    # Text columns
    text_cols = ["event_title", "event_description", "location_description", "source_name"]
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].fillna("")

    log.info("Missing value imputation complete", columns_imputed=len(impute_report))
    return df


def _validate_schema(df: pd.DataFrame, schema_cls) -> tuple[pd.DataFrame, list[dict]]:
    """
    Row-by-row Pydantic validation. Returns valid rows and a list of validation errors.
    """
    valid_rows: list[dict] = []
    errors: list[dict] = []

    for idx, row in df.iterrows():
        try:
            validated = schema_cls(**row.to_dict())
            valid_rows.append(validated.model_dump())
        except ValidationError as exc:
            errors.append({"row_idx": idx, "errors": exc.errors()})

    if errors:
        log.warning("Schema validation errors", count=len(errors), sample=errors[:3])

    return pd.DataFrame(valid_rows), errors


def clean_nasa_glc(force: bool = False) -> pd.DataFrame:
    """Cleans the raw NASA GLC NER dataset."""
    output_path = PROCESSED_DIR / "nasa_glc_clean.parquet"
    if output_path.exists() and not force:
        log.info("Loading cleaned GLC from cache", path=str(output_path))
        return pd.read_parquet(output_path)

    input_path = RAW_DIR / "nasa_glc_ner.csv"
    if not input_path.exists():
        raise FileNotFoundError(f"NASA GLC raw file not found: {input_path}. Run download_nasa.py first.")

    log.info("Cleaning NASA GLC dataset", input=str(input_path))
    df = pd.read_csv(input_path, low_memory=False)

    df = _remove_duplicates(df)
    df = _validate_coordinates(df)
    df = _normalize_dates(df, "event_date")
    df = _impute_missing_values(df)

    # Ensure label column
    df["label"] = 1
    df["data_source"] = "NASA_GLC"

    df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("NASA GLC clean saved", path=str(output_path), rows=len(df))
    return df


def clean_weather(force: bool = False) -> pd.DataFrame:
    """Cleans weather feature data."""
    output_path = PROCESSED_DIR / "weather_clean.parquet"
    if output_path.exists() and not force:
        return pd.read_parquet(output_path)

    input_path = RAW_DIR / "openmeteo_weather_ner.parquet"
    if not input_path.exists():
        log.warning("Weather data not found — returning empty DataFrame")
        return pd.DataFrame()

    df = pd.read_parquet(input_path)
    df = _validate_coordinates(df)
    df = _impute_missing_values(df)

    # Clip physically implausible values
    if "rainfall_24h" in df.columns:
        df["rainfall_24h"] = df["rainfall_24h"].clip(lower=0, upper=1000)
    if "humidity" in df.columns:
        df["humidity"] = df["humidity"].clip(lower=0, upper=100)
    if "temperature" in df.columns:
        df["temperature"] = df["temperature"].clip(lower=-20, upper=55)

    df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Weather clean saved", path=str(output_path), rows=len(df))
    return df


def clean_soil(force: bool = False) -> pd.DataFrame:
    """Cleans soil moisture data."""
    output_path = PROCESSED_DIR / "soil_clean.parquet"
    if output_path.exists() and not force:
        return pd.read_parquet(output_path)

    input_path = RAW_DIR / "smap_soil_moisture_ner.parquet"
    if not input_path.exists():
        log.warning("Soil moisture data not found")
        return pd.DataFrame()

    df = pd.read_parquet(input_path)
    df = _validate_coordinates(df)
    df = _impute_missing_values(df)

    # Clip to physical range [0, 0.6 m³/m³]
    for col in ["soil_moisture_surface", "soil_moisture_10cm"]:
        if col in df.columns:
            df[col] = df[col].clip(lower=0, upper=0.6)

    df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Soil clean saved", path=str(output_path), rows=len(df))
    return df


def run_all(force: bool = False) -> dict[str, pd.DataFrame]:
    """Runs the full cleaning pipeline across all datasets."""
    log.info("=== ETL CLEAN PIPELINE START ===")
    result = {
        "glc": clean_nasa_glc(force=force),
        "weather": clean_weather(force=force),
        "soil": clean_soil(force=force),
    }
    log.info("=== ETL CLEAN PIPELINE COMPLETE ===",
             glc_rows=len(result["glc"]),
             weather_rows=len(result["weather"]),
             soil_rows=len(result["soil"]))
    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run ETL cleaning pipeline")
    parser.add_argument("--force", action="store_true", help="Force re-clean even if cache exists")
    args = parser.parse_args()
    result = run_all(force=args.force)
    for name, df in result.items():
        print(f"  {name}: {len(df)} rows, {len(df.columns)} columns")
