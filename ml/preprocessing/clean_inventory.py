"""
APDA MITRA — ML Pipeline Step 1: Landslide Inventory Inspection & Preprocessing
================================================================================
Loads, audits, validates, and standardizes `Apda_Mitra_Verified_Landslide_Inventory_v2.csv`
without modifying the original raw file.

Target Region (10 States):
- Himachal Pradesh
- Uttarakhand
- Sikkim
- Arunachal Pradesh
- Assam
- Meghalaya
- Nagaland
- Manipur
- Mizoram
- Tripura

Outputs:
- ml/data/clean_landslide_events.csv
- ml/data/data_quality_report.json
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

# Paths
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
RAW_CSV_PATH = WORKSPACE_ROOT / "Apda_Mitra_Verified_Landslide_Inventory_v2.csv"
ML_DIR = WORKSPACE_ROOT / "ml"
ML_DATA_DIR = ML_DIR / "data"

ML_DATA_DIR.mkdir(parents=True, exist_ok=True)

TARGET_STATES = [
    "Himachal Pradesh",
    "Uttarakhand",
    "Sikkim",
    "Arunachal Pradesh",
    "Assam",
    "Meghalaya",
    "Nagaland",
    "Manipur",
    "Mizoram",
    "Tripura",
]


def preprocess_inventory():
    print("=" * 75)
    print("APDA MITRA — INSPECTION & PREPROCESSING PIPELINE")
    print("=" * 75)

    if not RAW_CSV_PATH.exists():
        raise FileNotFoundError(f"Input file not found at: {RAW_CSV_PATH}")

    # 1. Load Original CSV (Read-Only)
    df_raw = pd.read_csv(RAW_CSV_PATH)
    total_input_records = len(df_raw)
    original_columns = df_raw.columns.tolist()

    print(f"[*] Input File Located:      {RAW_CSV_PATH.name}")
    print(f"[*] Total Input Records:     {total_input_records}")
    print(f"[*] Total Original Columns:  {len(original_columns)}")

    # Audit initial missing values
    missing_counts = df_raw.isnull().sum().to_dict()
    missing_summary = {k: int(v) for k, v in missing_counts.items() if v > 0}

    # Tracking records removed and rationale
    removed_log = []

    # 2. Check and Remove Duplicate Event IDs
    initial_dup_mask = df_raw["event_id"].duplicated(keep="first")
    dup_ids_count = int(initial_dup_mask.sum())
    if dup_ids_count > 0:
        dup_ids = df_raw.loc[initial_dup_mask, "event_id"].tolist()
        removed_log.append({
            "reason": "Duplicate event_id",
            "count": dup_ids_count,
            "sample_ids": dup_ids[:5],
        })
        df_clean = df_raw[~initial_dup_mask].copy()
    else:
        df_clean = df_raw.copy()

    # 3. Numeric Latitude & Longitude Validation
    df_clean["latitude"] = pd.to_numeric(df_clean["latitude"], errors="coerce")
    df_clean["longitude"] = pd.to_numeric(df_clean["longitude"], errors="coerce")

    invalid_coords_mask = (
        df_clean["latitude"].isna() |
        df_clean["longitude"].isna() |
        (df_clean["latitude"] < 15.0) | (df_clean["latitude"] > 38.0) |
        (df_clean["longitude"] < 70.0) | (df_clean["longitude"] > 99.0)
    )
    invalid_coords_count = int(invalid_coords_mask.sum())
    if invalid_coords_count > 0:
        removed_log.append({
            "reason": "Invalid or out-of-bounds latitude/longitude coordinates",
            "count": invalid_coords_count,
            "sample_ids": df_clean.loc[invalid_coords_mask, "event_id"].head(5).tolist(),
        })
        df_clean = df_clean[~invalid_coords_mask].copy()

    # 4. Filter strictly to Target 10-State Region
    state_filter_mask = df_clean["state"].isin(TARGET_STATES)
    non_target_count = int((~state_filter_mask).sum())
    if non_target_count > 0:
        non_target_states = df_clean.loc[~state_filter_mask, "state"].unique().tolist()
        removed_log.append({
            "reason": "Record outside target 10-state Himalayan & Northeast region",
            "count": non_target_count,
            "states_excluded": non_target_states,
        })
        df_clean = df_clean[state_filter_mask].copy()

    # 5. Standardize Event Dates
    # Parse event dates to UTC timestamp and standard YYYY-MM-DD
    parsed_dates = pd.to_datetime(df_clean["event_date_parsed"], errors="coerce")
    fallback_dates = pd.to_datetime(df_clean["event_date"], errors="coerce")
    final_dates = parsed_dates.combine_first(fallback_dates)

    invalid_dates_mask = final_dates.isna()
    invalid_dates_count = int(invalid_dates_mask.sum())
    if invalid_dates_count > 0:
        removed_log.append({
            "reason": "Invalid or unparseable event date format",
            "count": invalid_dates_count,
            "sample_ids": df_clean.loc[invalid_dates_mask, "event_id"].head(5).tolist(),
        })
        df_clean = df_clean[~invalid_dates_mask].copy()
        final_dates = final_dates[~invalid_dates_mask]

    # Add standardized ISO date columns
    df_clean["date_std"] = final_dates.dt.strftime("%Y-%m-%d")
    df_clean["timestamp_utc"] = final_dates.dt.strftime("%Y-%m-%d %H:%M:%S")
    df_clean["year"] = final_dates.dt.year

    # 6. Preserve Original Event ID and Source Provenance
    # Ensure source provenance columns are retained without modification
    provenance_cols = [
        "source_name",
        "source_link",
        "source_catalog",
        "source_record_id",
        "source_dataset",
        "verification_basis",
        "data_quality_flag",
    ]
    for col in provenance_cols:
        if col not in df_clean.columns:
            df_clean[col] = None

    # Column ordering for clean intermediate dataset
    clean_columns_order = [
        "event_id",
        "date_std",
        "timestamp_utc",
        "year",
        "state",
        "latitude",
        "longitude",
        "event_title",
        "location_description",
        "location_accuracy",
        "landslide_category",
        "landslide_trigger",
        "landslide_size",
        "landslide_setting",
        "fatality_count",
        "injury_count",
        "source_name",
        "source_catalog",
        "source_record_id",
        "source_dataset",
        "source_link",
        "verification_basis",
        "data_quality_flag",
    ]
    # Filter to columns that exist in the dataframe
    clean_columns_order = [c for c in clean_columns_order if c in df_clean.columns]
    df_clean = df_clean[clean_columns_order]

    total_clean_records = len(df_clean)
    total_removed = total_input_records - total_clean_records

    # 7. Save Clean Intermediate Dataset
    clean_csv_path = ML_DATA_DIR / "clean_landslide_events.csv"
    df_clean.to_csv(clean_csv_path, index=False)

    # 8. Compute Audit Statistics
    state_counts = df_clean["state"].value_counts().to_dict()
    source_catalog_counts = df_clean["source_catalog"].value_counts(dropna=False).to_dict()
    category_counts = df_clean["landslide_category"].value_counts(dropna=False).to_dict()
    trigger_counts = df_clean["landslide_trigger"].value_counts(dropna=False).head(10).to_dict()

    min_date = df_clean["date_std"].min()
    max_date = df_clean["date_std"].max()

    # Missing values in clean intermediate dataset (no fabricated data)
    clean_missing = {k: int(v) for k, v in df_clean.isnull().sum().to_dict().items() if v > 0}

    # 9. Create Data-Quality Report JSON
    quality_report = {
        "title": "Apda Mitra Landslide Inventory Data Quality Report",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "input_file": str(RAW_CSV_PATH),
        "output_clean_file": str(clean_csv_path),
        "total_input_records": total_input_records,
        "total_clean_records": total_clean_records,
        "total_records_removed": total_removed,
        "records_removed_by_reason": removed_log,
        "target_region_states": TARGET_STATES,
        "state_distribution": state_counts,
        "source_catalog_distribution": {str(k): int(v) for k, v in source_catalog_counts.items()},
        "landslide_category_distribution": {str(k): int(v) for k, v in category_counts.items()},
        "top_landslide_triggers": {str(k): int(v) for k, v in trigger_counts.items()},
        "temporal_coverage": {
            "min_date": min_date,
            "max_date": max_date,
            "start_year": int(df_clean["year"].min()),
            "end_year": int(df_clean["year"].max()),
        },
        "missing_values_audit": {
            "raw_missing_counts": missing_summary,
            "clean_missing_counts": clean_missing,
            "note": "Per requirements, missing fields (e.g. fatality/injury counts, secondary descriptions) are preserved as raw nulls without invention.",
        },
    }

    report_json_path = ML_DATA_DIR / "data_quality_report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(quality_report, f, indent=2)

    # 10. Print Comprehensive Terminal Report
    print("\n" + "=" * 75)
    print("DATA AUDIT & PREPROCESSING SUMMARY")
    print("=" * 75)
    print(f"Total Input Records:      {total_input_records}")
    print(f"Total Clean Records:      {total_clean_records}")
    print(f"Records Removed:          {total_removed}")
    if total_removed == 0:
        print("  -> Rationale: All input records passed coordinate, date, and 10-state boundary checks with zero duplicate event IDs.")
    else:
        for r in removed_log:
            print(f"  -> {r['reason']}: {r['count']}")

    print(f"\nDate Range:               {min_date} to {max_date} ({df_clean['year'].min()} to {df_clean['year'].max()})")

    print("\nMissing Values in Clean Dataset (Unmodified):")
    for col, cnt in clean_missing.items():
        print(f"  {col:<24}: {cnt:>3} nulls ({cnt/total_clean_records*100:.1f}%)")

    print("\nState Counts (Target 10 States):")
    for st in TARGET_STATES:
        cnt = state_counts.get(st, 0)
        bar = "#" * int(cnt / 5)
        print(f"  {st:<20}: {cnt:>3} events {bar}")

    print("\nSource Catalog Counts:")
    for cat, cnt in source_catalog_counts.items():
        print(f"  {str(cat):<20}: {cnt:>3}")

    print("\nExact Files Created:")
    print(f"  1. {clean_csv_path}")
    print(f"  2. {report_json_path}")
    print("=" * 75)


if __name__ == "__main__":
    preprocess_inventory()
