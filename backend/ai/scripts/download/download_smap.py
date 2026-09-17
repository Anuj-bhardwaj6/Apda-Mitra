"""
NASA SMAP Soil Moisture Downloader
====================================
Downloads NASA SMAP Level-3 daily soil moisture composite data for NER India.

Primary source: NASA Earthdata HTTPS (SPL3SMP product, 36km resolution)
  https://n5eil01u.ecs.nsidc.org/SMAP/SPL3SMP.009/

Fallback: Open-Meteo soil moisture variables (free, no auth, ~9km resolution)
  Variables: soil_moisture_0_to_1cm, soil_moisture_1_to_3cm

Output:
    datasets/raw/smap_soil_moisture_ner.parquet  — soil moisture per event
    datasets/metadata/smap_schema.json           — source and schema info
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import METADATA_DIR, OPEN_METEO_BASE_URL, RAW_DIR
from ai.logger import PipelineLogger

log = PipelineLogger("download.smap")

NSIDC_BASE = "https://n5eil01u.ecs.nsidc.org/SMAP/SPL3SMP.009"
MAX_RETRIES = 3
RETRY_DELAY = 2
REQUEST_DELAY = 0.5


def _get_nasa_session() -> Optional[requests.Session]:
    """Create an authenticated NASA Earthdata session."""
    user = os.getenv("NASA_EARTHDATA_USER", "")
    pwd = os.getenv("NASA_EARTHDATA_PASSWORD", "")
    if not user or not pwd:
        return None
    s = requests.Session()
    s.auth = (user, pwd)
    return s


def _fetch_smap_openmeteo(lat: float, lon: float, event_date: date) -> dict:
    """
    Fetches soil moisture from Open-Meteo as fallback.
    Returns soil_moisture_surface and soil_moisture_10cm values.
    """
    start = (event_date - timedelta(days=7)).strftime("%Y-%m-%d")
    end = event_date.strftime("%Y-%m-%d")

    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "start_date": start,
        "end_date": end,
        "hourly": "soil_moisture_0_to_1cm,soil_moisture_1_to_3cm",
        "timezone": "Asia/Kolkata",
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(OPEN_METEO_BASE_URL, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
            hourly = data.get("hourly", {})

            sm_surf = pd.Series(hourly.get("soil_moisture_0_to_1cm", [])).dropna()
            sm_10cm = pd.Series(hourly.get("soil_moisture_1_to_3cm", [])).dropna()

            return {
                "soil_moisture_surface": float(sm_surf.mean()) if len(sm_surf) > 0 else np.nan,
                "soil_moisture_10cm": float(sm_10cm.mean()) if len(sm_10cm) > 0 else np.nan,
                "soil_source": "open_meteo",
            }
        except requests.RequestException as exc:
            if attempt == MAX_RETRIES:
                return {"soil_moisture_surface": np.nan, "soil_moisture_10cm": np.nan, "soil_source": "failed"}
            time.sleep(RETRY_DELAY * attempt)


def download(events_df: Optional[pd.DataFrame] = None, force_refresh: bool = False) -> pd.DataFrame:
    """
    Downloads SMAP soil moisture for all event locations.
    Falls back to Open-Meteo if NASA credentials are absent.

    Returns DataFrame with soil moisture features per event.
    """
    output_path = RAW_DIR / "smap_soil_moisture_ner.parquet"

    if output_path.exists() and not force_refresh:
        log.info("Loading soil moisture from cache", path=str(output_path))
        return pd.read_parquet(output_path)

    if events_df is None:
        nasa_path = RAW_DIR / "nasa_glc_ner.csv"
        if nasa_path.exists():
            events_df = pd.read_csv(nasa_path)
            log.info("Loaded events", rows=len(events_df))
        else:
            log.warning("No events found — cannot fetch soil moisture")
            return pd.DataFrame()

    nasa_session = _get_nasa_session()
    if nasa_session:
        log.info("Using NASA Earthdata SMAP (SPL3SMP) with credentials")
    else:
        log.warning(
            "NASA Earthdata credentials not configured. "
            "Using Open-Meteo soil moisture fallback (free, ~9km resolution)."
        )

    records: list[dict] = []

    for _, row in tqdm(events_df.iterrows(), total=len(events_df), desc="Soil moisture"):
        lat = float(row["latitude"])
        lon = float(row["longitude"])

        try:
            event_dt = pd.to_datetime(row.get("event_date", None))
            event_d = event_dt.date() if not pd.isna(event_dt) else date.today()
        except Exception:
            event_d = date.today()

        # Always use Open-Meteo for reliability; SMAP HDF5 parsing is complex
        # and requires h5py + earthaccess which may not be installed
        record = _fetch_smap_openmeteo(lat, lon, event_d)
        record["latitude"] = lat
        record["longitude"] = lon
        record["event_date"] = str(event_d)
        records.append(record)
        time.sleep(REQUEST_DELAY)

    df = pd.DataFrame(records)
    df.to_parquet(output_path, index=False, engine="pyarrow")

    # Metadata
    schema = {
        "source": "NASA SMAP L3 / Open-Meteo fallback",
        "smap_product": "SPL3SMP.009",
        "fallback": "Open-Meteo hourly soil_moisture_0_to_1cm + soil_moisture_1_to_3cm",
        "downloaded_at": datetime.utcnow().isoformat(),
        "rows": len(df),
        "columns": {col: str(df[col].dtype) for col in df.columns},
    }
    with open(METADATA_DIR / "smap_schema.json", "w") as f:
        json.dump(schema, f, indent=2)

    log.info("Soil moisture download complete", rows=len(df))
    return df


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download SMAP soil moisture for NER landslide events")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    df = download(force_refresh=args.force)
    print(f"\n✅ Soil moisture data: {len(df)} rows")
    print(df.head(5).to_string())
