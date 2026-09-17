"""
Open-Meteo Historical Weather Downloader
=========================================
Downloads historical weather data for each landslide event location using
the Open-Meteo Historical Weather API (free, no API key required).

For each event: fetches a 30-day trailing window ending on the event date,
providing rainfall accumulations (24h, 72h, 7d), humidity, temperature,
wind speed, and surface pressure.

Also downloads a complementary non-event weather grid across NER for
use in generating negative training samples.

Output:
    datasets/raw/openmeteo_weather_ner.parquet  — weather per event
    datasets/raw/openmeteo_grid_ner.parquet     — background weather grid
    datasets/metadata/openmeteo_schema.json     — column schema

API Docs: https://open-meteo.com/en/docs/historical-weather-api
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    METADATA_DIR,
    NER_BBOX,
    OPEN_METEO_BASE_URL,
    PROCESSED_DIR,
    RAW_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("download.openmeteo")

# Weather variables to fetch from Open-Meteo
DAILY_VARIABLES = [
    "precipitation_sum",          # mm/day
    "rain_sum",                   # mm/day (excludes snow)
    "temperature_2m_max",
    "temperature_2m_min",
    "temperature_2m_mean",
    "windspeed_10m_max",
    "surface_pressure_mean",
]
HOURLY_VARIABLES = [
    "relative_humidity_2m",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
]

MAX_RETRIES = 3
RETRY_DELAY_SEC = 2
REQUEST_DELAY_SEC = 0.5   # Respect Open-Meteo rate limits (10 req/sec)


def _fetch_weather_for_point(
    lat: float,
    lon: float,
    end_date: date,
    window_days: int = 30,
) -> Optional[dict[str, Any]]:
    """
    Fetches historical weather for a single lat/lon over a trailing window.

    Returns a dict of aggregated weather features or None on failure.
    """
    start_date = end_date - timedelta(days=window_days)

    params: dict[str, Any] = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ",".join(DAILY_VARIABLES),
        "hourly": ",".join(HOURLY_VARIABLES),
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "kmh",
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(OPEN_METEO_BASE_URL, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            daily = data.get("daily", {})
            hourly = data.get("hourly", {})

            if not daily or "precipitation_sum" not in daily:
                return None

            precip = pd.Series(daily["precipitation_sum"]).dropna()
            rain = pd.Series(daily["rain_sum"]).dropna()
            temp_mean = pd.Series(daily.get("temperature_2m_mean", [])).dropna()
            wind = pd.Series(daily.get("windspeed_10m_max", [])).dropna()
            pressure = pd.Series(daily.get("surface_pressure_mean", [])).dropna()

            # Hourly → daily mean
            humidity_series = pd.Series(hourly.get("relative_humidity_2m", [])).dropna()
            soil_surf = pd.Series(hourly.get("soil_moisture_0_to_1cm", [])).dropna()
            soil_10cm = pd.Series(hourly.get("soil_moisture_1_to_3cm", [])).dropna()

            # Accumulations on the last N days
            rain_24h = float(precip.iloc[-1]) if len(precip) > 0 else 0.0
            rain_72h = float(precip.iloc[-3:].sum()) if len(precip) >= 3 else float(precip.sum())
            rain_7d = float(precip.iloc[-7:].sum()) if len(precip) >= 7 else float(precip.sum())

            return {
                "rainfall_24h": max(0.0, rain_24h),
                "rainfall_72h": max(0.0, rain_72h),
                "rainfall_7d": max(0.0, rain_7d),
                "humidity": float(humidity_series.mean()) if len(humidity_series) > 0 else np.nan,
                "temperature": float(temp_mean.mean()) if len(temp_mean) > 0 else np.nan,
                "wind_speed": float(wind.mean()) if len(wind) > 0 else np.nan,
                "pressure": float(pressure.mean()) if len(pressure) > 0 else np.nan,
                "soil_moisture_surface": float(soil_surf.mean()) if len(soil_surf) > 0 else np.nan,
                "soil_moisture_10cm": float(soil_10cm.mean()) if len(soil_10cm) > 0 else np.nan,
                "weather_fetch_date": end_date.strftime("%Y-%m-%d"),
                "weather_start_date": start_date.strftime("%Y-%m-%d"),
            }

        except requests.RequestException as exc:
            log.warning("Weather fetch attempt failed", attempt=attempt, lat=lat, lon=lon, error=str(exc))
            if attempt == MAX_RETRIES:
                return None
            time.sleep(RETRY_DELAY_SEC * attempt)

    return None


def download_event_weather(events_df: pd.DataFrame, output_path: Path) -> pd.DataFrame:
    """
    Downloads weather for all landslide event points.

    Args:
        events_df: DataFrame with columns [latitude, longitude, event_date]
        output_path: Where to save the result parquet

    Returns:
        DataFrame with weather features merged to events.
    """
    if output_path.exists():
        log.info("Loading event weather from cache", path=str(output_path))
        return pd.read_parquet(output_path)

    log.info("Fetching weather for event points", n_events=len(events_df))

    weather_records: list[dict] = []

    for _, row in tqdm(events_df.iterrows(), total=len(events_df), desc="Event weather"):
        lat = row["latitude"]
        lon = row["longitude"]

        # Parse event date
        try:
            event_dt = pd.to_datetime(row.get("event_date", None))
            if pd.isna(event_dt):
                event_dt = datetime.utcnow()
            end_date = event_dt.date()
        except Exception:
            end_date = date.today()

        weather = _fetch_weather_for_point(lat, lon, end_date)
        if weather is None:
            weather = {k: np.nan for k in [
                "rainfall_24h", "rainfall_72h", "rainfall_7d", "humidity",
                "temperature", "wind_speed", "pressure",
                "soil_moisture_surface", "soil_moisture_10cm",
                "weather_fetch_date", "weather_start_date",
            ]}

        weather["latitude"] = lat
        weather["longitude"] = lon
        weather_records.append(weather)
        time.sleep(REQUEST_DELAY_SEC)

    result_df = pd.DataFrame(weather_records)
    result_df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Event weather saved", path=str(output_path), rows=len(result_df))
    return result_df


def download_grid_weather(output_path: Path, grid_step: float = 0.25) -> pd.DataFrame:
    """
    Downloads representative weather at a coarse NER grid for background
    negative sample enrichment. Uses today's date as the reference point.

    Args:
        output_path: Where to save the result parquet
        grid_step: Degree spacing between grid points (0.25° ≈ 27km)

    Returns:
        DataFrame with weather features at each grid point.
    """
    if output_path.exists():
        log.info("Loading grid weather from cache", path=str(output_path))
        return pd.read_parquet(output_path)

    min_lon, min_lat, max_lon, max_lat = NER_BBOX
    lats = np.arange(min_lat, max_lat + grid_step, grid_step)
    lons = np.arange(min_lon, max_lon + grid_step, grid_step)

    grid_points = [(float(lat), float(lon)) for lat in lats for lon in lons]
    log.info("Fetching grid weather", n_points=len(grid_points), step_deg=grid_step)

    today = date.today()
    records: list[dict] = []

    for lat, lon in tqdm(grid_points, desc="Grid weather"):
        weather = _fetch_weather_for_point(lat, lon, today, window_days=30)
        if weather:
            weather["latitude"] = lat
            weather["longitude"] = lon
            records.append(weather)
        time.sleep(REQUEST_DELAY_SEC)

    df = pd.DataFrame(records)
    df.to_parquet(output_path, index=False, engine="pyarrow")
    log.info("Grid weather saved", path=str(output_path), rows=len(df))
    return df


def download(events_df: Optional[pd.DataFrame] = None, force_refresh: bool = False) -> dict[str, pd.DataFrame]:
    """
    Main entry point: downloads weather for events + background grid.

    Args:
        events_df: Landslide events DataFrame (from download_nasa.py).
                   If None, attempts to load from cache.
        force_refresh: Re-download even if cached.

    Returns:
        Dict with keys 'events' and 'grid'.
    """
    event_weather_path = RAW_DIR / "openmeteo_weather_ner.parquet"
    grid_weather_path = RAW_DIR / "openmeteo_grid_ner.parquet"

    if force_refresh:
        event_weather_path.unlink(missing_ok=True)
        grid_weather_path.unlink(missing_ok=True)

    # Load events if not provided
    if events_df is None:
        nasa_path = RAW_DIR / "nasa_glc_ner.csv"
        if nasa_path.exists():
            events_df = pd.read_csv(nasa_path)
            log.info("Loaded events from NASA GLC cache", rows=len(events_df))
        else:
            log.warning("No events file found — skipping event weather download")
            events_df = pd.DataFrame(columns=["latitude", "longitude", "event_date"])

    event_weather = download_event_weather(events_df, event_weather_path)
    grid_weather = download_grid_weather(grid_weather_path)

    # Save schema metadata
    schema = {
        "source": "Open-Meteo Historical Weather API",
        "url": OPEN_METEO_BASE_URL,
        "downloaded_at": datetime.utcnow().isoformat(),
        "daily_variables": DAILY_VARIABLES,
        "hourly_variables": HOURLY_VARIABLES,
        "event_weather_rows": len(event_weather),
        "grid_weather_rows": len(grid_weather),
        "columns": {col: str(event_weather[col].dtype) for col in event_weather.columns},
    }
    schema_path = METADATA_DIR / "openmeteo_schema.json"
    with open(schema_path, "w") as f:
        json.dump(schema, f, indent=2)

    log.info("Open-Meteo download pipeline complete")
    return {"events": event_weather, "grid": grid_weather}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download Open-Meteo weather for NER landslide events")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    result = download(force_refresh=args.force)
    print(f"\n✅ Event weather: {len(result['events'])} rows")
    print(f"✅ Grid weather:  {len(result['grid'])} rows")
    print(result["events"].head(3).to_string())
