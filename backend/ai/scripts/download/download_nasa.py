"""
NASA Global Landslide Catalog (GLC) Downloader
===============================================
Downloads the full NASA GLC dataset via the Socrata Open Data API and filters
it to the North Eastern Region (NER) of India.

Data Source:
    https://data.nasa.gov/Earth-Science/Global-Landslide-Catalog-Export/dd9e-wu2v
    CKAN: https://catalog.data.gov/dataset/global-landslide-catalog-export

Output:
    datasets/raw/nasa_glc_ner.csv          — NER-filtered landslide events
    datasets/raw/nasa_glc_global.csv       — Full global catalog (cached)
    datasets/metadata/nasa_glc_schema.json — Column schema and statistics

No API key required for the public Socrata endpoint.
NASA Earthdata credentials are required for higher-resolution GLC+ products.
"""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import requests
from tqdm import tqdm

# Add project root to path for relative imports
import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    METADATA_DIR,
    NASA_GLC_CSV_URL,
    NER_BBOX,
    NER_STATES,
    RAW_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("download.nasa_glc")

# Socrata API (paginated JSON) — more reliable than raw CSV for large datasets
SOCRATA_BASE_URL = "https://data.nasa.gov/resource/dd9e-wu2v.json"
SOCRATA_PAGE_SIZE = 50_000
MAX_RETRIES = 3
RETRY_DELAY_SEC = 5


def _download_via_socrata(output_path: Path) -> pd.DataFrame:
    """
    Downloads the full GLC dataset using the Socrata JSON API with pagination.
    Falls back to direct CSV download if Socrata API fails.
    """
    all_records: list[dict] = []
    offset = 0

    log.info("Starting paginated Socrata download", url=SOCRATA_BASE_URL)

    with tqdm(desc="Downloading NASA GLC (Socrata)", unit=" records") as pbar:
        while True:
            params = {
                "$limit": SOCRATA_PAGE_SIZE,
                "$offset": offset,
                "$order": "event_date ASC",
            }
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    resp = requests.get(SOCRATA_BASE_URL, params=params, timeout=60)
                    resp.raise_for_status()
                    batch = resp.json()
                    break
                except requests.RequestException as exc:
                    log.warning(
                        "Socrata fetch attempt failed",
                        attempt=attempt,
                        error=str(exc),
                    )
                    if attempt == MAX_RETRIES:
                        raise
                    time.sleep(RETRY_DELAY_SEC * attempt)

            if not batch:
                break

            all_records.extend(batch)
            pbar.update(len(batch))
            offset += len(batch)

            if len(batch) < SOCRATA_PAGE_SIZE:
                break  # Last page

    log.info("Socrata download complete", total_records=len(all_records))
    df = pd.DataFrame(all_records)

    # Save global cache
    global_path = RAW_DIR / "nasa_glc_global.csv"
    df.to_csv(global_path, index=False)
    log.info("Global catalog cached", path=str(global_path))

    return df


def _download_via_direct_csv(output_path: Path) -> pd.DataFrame:
    """Fallback: direct CSV download from data.nasa.gov."""
    log.info("Falling back to direct CSV download", url=NASA_GLC_CSV_URL)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(NASA_GLC_CSV_URL, timeout=120, stream=True)
            resp.raise_for_status()

            total = int(resp.headers.get("content-length", 0))
            with open(output_path, "wb") as f:
                with tqdm(
                    total=total, unit="B", unit_scale=True, desc="NASA GLC CSV"
                ) as pbar:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                        pbar.update(len(chunk))

            return pd.read_csv(output_path, low_memory=False)
        except requests.RequestException as exc:
            log.warning("Direct CSV attempt failed", attempt=attempt, error=str(exc))
            if attempt == MAX_RETRIES:
                raise
            time.sleep(RETRY_DELAY_SEC * attempt)


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalizes column names between Socrata JSON and direct CSV formats.
    Socrata returns snake_case; CSV may return display names.
    """
    # Socrata JSON column mapping
    col_map = {
        "event_date": "event_date",
        "event_title": "event_title",
        "event_description": "event_description",
        "location_description": "location_description",
        "location_accuracy": "location_accuracy",
        "landslide_category": "landslide_category",
        "landslide_trigger": "landslide_trigger",
        "landslide_size": "landslide_size",
        "landslide_setting": "landslide_setting",
        "fatality_count": "fatality_count",
        "injury_count": "injury_count",
        "storm_name": "storm_name",
        "country_name": "country_name",
        "admin_division_name": "admin_division_name",
        "gazeteer_closest_point": "gazeteer_closest_point",
        "gazeteer_distance": "gazeteer_distance",
        "latitude": "latitude",
        "longitude": "longitude",
        "photo_link": "photo_link",
        "source_name": "source_name",
        "source_link": "source_link",
        # CSV format variants
        "Latitude": "latitude",
        "Longitude": "longitude",
        "Country Name": "country_name",
        "Admin Division Name": "admin_division_name",
        "Event Date": "event_date",
        "Landslide Category": "landslide_category",
        "Landslide Trigger": "landslide_trigger",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})
    return df


def _filter_ner(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filters records to NER India bounding box and/or country/state name matching.
    Uses both coordinate-based and name-based filtering for maximum recall.
    """
    log.info("Filtering for NER India", input_rows=len(df))

    # Ensure lat/lon are numeric
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    min_lon, min_lat, max_lon, max_lat = NER_BBOX

    # Coordinate-based filter
    bbox_mask = (
        (df["latitude"] >= min_lat)
        & (df["latitude"] <= max_lat)
        & (df["longitude"] >= min_lon)
        & (df["longitude"] <= max_lon)
    )

    # Name-based filter (for records with slightly off coordinates)
    name_mask = pd.Series(False, index=df.index)
    if "country_name" in df.columns:
        name_mask |= df["country_name"].str.contains("India", na=False, case=False)
    if "admin_division_name" in df.columns:
        state_pattern = "|".join(NER_STATES)
        name_mask |= df["admin_division_name"].str.contains(
            state_pattern, na=False, case=False
        )

    ner_df = df[bbox_mask | (name_mask & (df["country_name"].str.contains("India", na=False, case=False) if "country_name" in df.columns else pd.Series(False, index=df.index)))]

    log.info("NER filter complete", output_rows=len(ner_df))
    return ner_df.reset_index(drop=True)


def _validate_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    Applies data quality rules to the raw NER GLC data.
    """
    initial_len = len(df)

    # 1. Remove exact duplicates
    df = df.drop_duplicates()

    # 2. Parse event_date to datetime
    if "event_date" in df.columns:
        df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce", utc=True)

    # 3. Validate coordinate ranges for NER
    min_lon, min_lat, max_lon, max_lat = NER_BBOX
    valid_coords = (
        (df["latitude"] >= min_lat)
        & (df["latitude"] <= max_lat)
        & (df["longitude"] >= min_lon)
        & (df["longitude"] <= max_lon)
    )
    df = df[valid_coords]

    # 4. Cast numeric columns
    for col in ["fatality_count", "injury_count", "gazeteer_distance"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # 5. Add source label
    df["data_source"] = "NASA_GLC"
    df["label"] = 1  # All GLC records are positive landslide events

    log.info(
        "Validation complete",
        initial=initial_len,
        final=len(df),
        removed=initial_len - len(df),
    )
    return df.reset_index(drop=True)


def _save_schema_metadata(df: pd.DataFrame) -> None:
    """Saves column schema and summary statistics to metadata directory."""
    schema = {
        "source": "NASA Global Landslide Catalog",
        "url": NASA_GLC_CSV_URL,
        "downloaded_at": datetime.utcnow().isoformat(),
        "total_ner_records": len(df),
        "date_range": {
            "min": str(df["event_date"].min()) if "event_date" in df.columns else None,
            "max": str(df["event_date"].max()) if "event_date" in df.columns else None,
        },
        "columns": {
            col: {
                "dtype": str(df[col].dtype),
                "null_count": int(df[col].isna().sum()),
                "null_pct": round(df[col].isna().mean() * 100, 2),
            }
            for col in df.columns
        },
        "coordinate_stats": {
            "lat_min": float(df["latitude"].min()),
            "lat_max": float(df["latitude"].max()),
            "lon_min": float(df["longitude"].min()),
            "lon_max": float(df["longitude"].max()),
        },
    }

    schema_path = METADATA_DIR / "nasa_glc_schema.json"
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2, default=str)
    log.info("Schema metadata saved", path=str(schema_path))


def download(force_refresh: bool = False) -> pd.DataFrame:
    """
    Main entry point: downloads, filters, validates, and saves the NASA GLC
    dataset for NER India.

    Args:
        force_refresh: If True, re-downloads even if cached file exists.

    Returns:
        DataFrame of validated NER landslide events.
    """
    output_path = RAW_DIR / "nasa_glc_ner.csv"

    if output_path.exists() and not force_refresh:
        log.info("Loading from cache", path=str(output_path))
        df = pd.read_csv(output_path, low_memory=False)
        log.info("Cache loaded", rows=len(df))
        return df

    log.info("Starting NASA GLC download pipeline")

    # Try Socrata API first, fall back to direct CSV
    try:
        df_raw = _download_via_socrata(output_path)
    except Exception as exc:
        log.warning("Socrata API failed, switching to direct CSV", error=str(exc))
        df_raw = _download_via_direct_csv(output_path)

    # Normalize → filter → validate
    df_raw = _normalize_columns(df_raw)
    df_ner = _filter_ner(df_raw)
    df_clean = _validate_and_clean(df_ner)

    # Save
    df_clean.to_csv(output_path, index=False)
    log.info("NER dataset saved", path=str(output_path), rows=len(df_clean))

    _save_schema_metadata(df_clean)

    return df_clean


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Download NASA Global Landslide Catalog for NER India")
    parser.add_argument("--force", action="store_true", help="Force re-download even if cached")
    args = parser.parse_args()

    df = download(force_refresh=args.force)
    print(f"\n✅ Downloaded {len(df)} NER landslide records")
    print(df[["event_date", "latitude", "longitude", "landslide_category", "landslide_trigger"]].head(10).to_string())
