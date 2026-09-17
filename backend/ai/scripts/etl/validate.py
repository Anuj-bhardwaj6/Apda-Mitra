"""
ETL — Dataset Validation Pipeline
===================================
Validates processed datasets before merging:
  - Class balance check (landslide vs non-landslide ratio)
  - Feature completeness (% missing per column)
  - Coordinate range checks within NER bbox
  - Statistical outlier detection (IQR-based)
  - Generates a JSON validation report

Input:  datasets/processed/*.parquet
Output: datasets/metadata/validation_report.json
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import FEATURE_COLUMNS, METADATA_DIR, NER_BBOX, PROCESSED_DIR, TARGET_COLUMN
from ai.logger import PipelineLogger

log = PipelineLogger("etl.validate")

REPORT_PATH = METADATA_DIR / "validation_report.json"


def check_class_balance(df: pd.DataFrame) -> dict[str, Any]:
    """Checks positive/negative label ratio."""
    if TARGET_COLUMN not in df.columns:
        return {"status": "SKIP", "reason": "target column missing"}

    counts = df[TARGET_COLUMN].value_counts().to_dict()
    total = len(df)
    pos = counts.get(1, 0)
    neg = counts.get(0, 0)
    ratio = pos / max(neg, 1)

    status = "OK" if 0.05 <= ratio <= 20.0 else "WARNING"
    return {
        "status": status,
        "positive": int(pos),
        "negative": int(neg),
        "ratio_pos_to_neg": round(ratio, 3),
        "pct_positive": round(pos / max(total, 1) * 100, 2),
    }


def check_feature_completeness(df: pd.DataFrame) -> dict[str, Any]:
    """Reports missing value percentage per column."""
    total = len(df)
    report: dict[str, Any] = {}
    high_missing: list[str] = []

    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        pct = round(n_missing / max(total, 1) * 100, 2)
        report[col] = {"missing_count": n_missing, "missing_pct": pct}
        if pct > 20.0:
            high_missing.append(col)

    status = "WARNING" if high_missing else "OK"
    return {
        "status": status,
        "high_missing_columns": high_missing,
        "columns": report,
    }


def check_coordinate_validity(df: pd.DataFrame) -> dict[str, Any]:
    """Validates all coordinates are within NER bbox."""
    min_lon, min_lat, max_lon, max_lat = NER_BBOX

    lat_ok = df["latitude"].between(min_lat, max_lat) if "latitude" in df.columns else pd.Series(True, index=df.index)
    lon_ok = df["longitude"].between(min_lon, max_lon) if "longitude" in df.columns else pd.Series(True, index=df.index)

    out_of_bbox = (~(lat_ok & lon_ok)).sum()
    status = "WARNING" if out_of_bbox > 0 else "OK"

    return {
        "status": status,
        "out_of_bbox_rows": int(out_of_bbox),
        "bbox": NER_BBOX,
    }


def check_statistical_outliers(df: pd.DataFrame) -> dict[str, Any]:
    """IQR-based outlier detection for continuous features."""
    continuous = [
        "rainfall_24h", "rainfall_72h", "rainfall_7d",
        "elevation", "slope", "humidity", "temperature",
        "soil_moisture_surface", "soil_moisture_10cm",
    ]
    outlier_report: dict[str, Any] = {}

    for col in continuous:
        if col not in df.columns:
            continue
        series = df[col].dropna()
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 3 * iqr, q3 + 3 * iqr
        outliers = ((series < lower) | (series > upper)).sum()
        outlier_report[col] = {
            "outlier_count": int(outliers),
            "outlier_pct": round(outliers / max(len(series), 1) * 100, 2),
            "iqr_lower": round(float(lower), 4),
            "iqr_upper": round(float(upper), 4),
        }

    return {"status": "INFO", "columns": outlier_report}


def validate_dataset(df: pd.DataFrame, name: str) -> dict[str, Any]:
    """Runs all validation checks on a single DataFrame."""
    log.info("Validating dataset", name=name, rows=len(df), cols=len(df.columns))

    report: dict[str, Any] = {
        "dataset": name,
        "rows": len(df),
        "columns": len(df.columns),
        "validated_at": datetime.utcnow().isoformat(),
        "checks": {
            "class_balance": check_class_balance(df),
            "feature_completeness": check_feature_completeness(df),
            "coordinate_validity": check_coordinate_validity(df),
            "statistical_outliers": check_statistical_outliers(df),
        },
    }

    # Overall status
    statuses = [v.get("status", "OK") for v in report["checks"].values()]
    if "ERROR" in statuses:
        report["overall_status"] = "ERROR"
    elif "WARNING" in statuses:
        report["overall_status"] = "WARNING"
    else:
        report["overall_status"] = "OK"

    log.info("Validation result", name=name, status=report["overall_status"])
    return report


def run_all() -> dict[str, Any]:
    """Validates all processed datasets and generates a combined report."""
    log.info("=== VALIDATION PIPELINE START ===")

    full_report: dict[str, Any] = {
        "generated_at": datetime.utcnow().isoformat(),
        "datasets": {},
    }

    datasets = {
        "nasa_glc_clean": PROCESSED_DIR / "nasa_glc_clean.parquet",
        "weather_clean": PROCESSED_DIR / "weather_clean.parquet",
        "soil_clean": PROCESSED_DIR / "soil_clean.parquet",
        "merged_training": PROCESSED_DIR / "merged_training.parquet",
    }

    for name, path in datasets.items():
        if not path.exists():
            full_report["datasets"][name] = {"status": "SKIP", "reason": "file not found"}
            continue
        df = pd.read_parquet(path)
        full_report["datasets"][name] = validate_dataset(df, name)

    # Save report
    with open(REPORT_PATH, "w") as f:
        json.dump(full_report, f, indent=2, default=str)

    log.info("=== VALIDATION COMPLETE ===", report_path=str(REPORT_PATH))
    return full_report


if __name__ == "__main__":
    report = run_all()
    for name, data in report["datasets"].items():
        status = data.get("overall_status", data.get("status", "?"))
        print(f"  {name}: {status}")
    print(f"\nFull report: {REPORT_PATH}")
