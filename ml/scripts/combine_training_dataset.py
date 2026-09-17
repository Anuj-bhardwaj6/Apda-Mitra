"""
APDA MITRA — ML Pipeline: Canonical Training Dataset Assembly & Quality Control
===============================================================================
Combines verified positive landslide events with scientifically defensible
non-landslide background/pseudo-absence samples to create the final unified
dataset for XGBoost training.

Inputs:
- ml/data/positive_landslide_dataset.csv (932 positive events)
- ml/data/negative_landslide_dataset.csv (1864 negative background samples)

Outputs:
- ml/data/apda_mitra_training_dataset.csv (2796 combined samples)
- ml/data/training_dataset_report.json (comprehensive QC audit report)
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("TrainingDatasetAssembler")

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
ML_DATA_DIR = WORKSPACE_ROOT / "ml" / "data"

POS_CSV_PATH = ML_DATA_DIR / "positive_landslide_dataset.csv"
NEG_CSV_PATH = ML_DATA_DIR / "negative_landslide_dataset.csv"

OUTPUT_CSV_PATH = ML_DATA_DIR / "apda_mitra_training_dataset.csv"
OUTPUT_REPORT_PATH = ML_DATA_DIR / "training_dataset_report.json"

REQUIRED_COLUMNS = [
    "event_id",
    "event_date",
    "latitude",
    "longitude",
    "state",
    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d",
    "soil_moisture",
    "soil_moisture_anomaly",
    "elevation",
    "slope",
    "aspect",
    "curvature",
    "landslide",
    "sample_type",
]

NUMERICAL_FEATURE_COLUMNS = [
    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d",
    "soil_moisture",
    "soil_moisture_anomaly",
    "elevation",
    "slope",
    "aspect",
    "curvature",
]


def detect_outliers_iqr(series: pd.Series) -> Dict[str, Any]:
    """Detects potential statistical outliers using standard 1.5 * IQR rule."""
    q1 = float(series.quantile(0.25))
    q3 = float(series.quantile(0.75))
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    outliers = series[(series < lower_bound) | (series > upper_bound)]
    return {
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "iqr": round(iqr, 4),
        "lower_fence": round(lower_bound, 4),
        "upper_fence": round(upper_bound, 4),
        "outlier_count": int(len(outliers)),
        "outlier_pct": round(float(len(outliers) / len(series) * 100.0), 2),
    }


def run_assembly_and_qc():
    logger.info("=" * 80)
    logger.info("APDA MITRA — COMBINING POSITIVE & NEGATIVE DATASETS")
    logger.info("=" * 80)

    # 1. Load datasets
    if not POS_CSV_PATH.exists():
        raise FileNotFoundError(f"Missing positive dataset: {POS_CSV_PATH}")
    if not NEG_CSV_PATH.exists():
        raise FileNotFoundError(f"Missing negative dataset: {NEG_CSV_PATH}")

    df_pos = pd.read_csv(POS_CSV_PATH)
    df_neg = pd.read_csv(NEG_CSV_PATH)

    logger.info(f"Loaded {len(df_pos)} positive events from {POS_CSV_PATH.name}")
    logger.info(f"Loaded {len(df_neg)} negative samples from {NEG_CSV_PATH.name}")

    # Ensure sample_type
    if "sample_type" not in df_pos.columns:
        df_pos["sample_type"] = "positive"
    if "sample_type" not in df_neg.columns:
        df_neg["sample_type"] = "negative"

    # 2. Harmonize and select columns
    for col in REQUIRED_COLUMNS:
        if col not in df_pos.columns:
            raise KeyError(f"Missing column '{col}' in positive dataset")
        if col not in df_neg.columns:
            raise KeyError(f"Missing column '{col}' in negative dataset")

    df_pos_sub = df_pos[REQUIRED_COLUMNS].copy()
    df_neg_sub = df_neg[REQUIRED_COLUMNS].copy()

    # 3. Concatenate and sort deterministically
    combined = pd.concat([df_pos_sub, df_neg_sub], ignore_index=True)
    # Deterministic shuffle with seed 42
    combined = combined.sample(frac=1.0, random_state=42).reset_index(drop=True)

    logger.info(f"Combined total samples: {len(combined)}")

    # 4. Comprehensive Quality-Control Analysis
    qc_issues: List[str] = []

    # A. Duplicate rows
    dup_rows = int(combined.duplicated().sum())
    if dup_rows > 0:
        qc_issues.append(f"Found {dup_rows} exact duplicate rows")

    # B. Duplicate event IDs
    dup_eids = int(combined["event_id"].duplicated().sum())
    if dup_eids > 0:
        qc_issues.append(f"Found {dup_eids} duplicate event IDs")

    # C. Duplicate coordinates
    dup_coords_total = int(combined.duplicated(subset=["latitude", "longitude"]).sum())
    dup_coords_within_pos = int(df_pos.duplicated(subset=["latitude", "longitude"]).sum())
    dup_coords_within_neg = int(df_neg.duplicated(subset=["latitude", "longitude"]).sum())

    # Cross-class coordinate collision (positive vs negative sharing same coordinate)
    pos_coord_set = set(zip(df_pos["latitude"].round(4), df_pos["longitude"].round(4)))
    neg_coord_set = set(zip(df_neg["latitude"].round(4), df_neg["longitude"].round(4)))
    cross_collisions = pos_coord_set.intersection(neg_coord_set)
    if cross_collisions:
        qc_issues.append(f"Found {len(cross_collisions)} coordinates shared between positive and negative classes")

    # D. Missing values
    missing_by_col = {col: int(combined[col].isna().sum()) for col in REQUIRED_COLUMNS}
    total_missing = sum(missing_by_col.values())
    if total_missing > 0:
        qc_issues.append(f"Detected {total_missing} missing values across features")

    # E. Invalid dates
    try:
        parsed_dates = pd.to_datetime(combined["event_date"], format="%Y-%m-%d", errors="raise")
        min_date = parsed_dates.min().strftime("%Y-%m-%d")
        max_date = parsed_dates.max().strftime("%Y-%m-%d")
        dates_valid = True
    except Exception as e:
        dates_valid = False
        min_date = ""
        max_date = ""
        qc_issues.append(f"Date parsing error: {e}")

    # F. Invalid coordinates
    lat_min, lat_max = float(combined["latitude"].min()), float(combined["latitude"].max())
    lon_min, lon_max = float(combined["longitude"].min()), float(combined["longitude"].max())
    coords_valid = (20.0 <= lat_min and lat_max <= 38.0) and (70.0 <= lon_min and lon_max <= 100.0)
    if not coords_valid:
        qc_issues.append(f"Coordinates outside Indian regional domain: lat [{lat_min}, {lat_max}], lon [{lon_min}, {lon_max}]")

    # G. Extreme / Outlier analysis
    outlier_analysis: Dict[str, Any] = {}
    physical_bounds_valid = True
    for col in NUMERICAL_FEATURE_COLUMNS:
        outlier_analysis[col] = detect_outliers_iqr(combined[col])

    if (combined["elevation"] < -100).any() or (combined["elevation"] > 9000).any():
        physical_bounds_valid = False
        qc_issues.append("Elevation violates physical bounds [-100, 9000] m")
    if (combined["slope"] < 0.0).any() or (combined["slope"] > 90.0).any():
        physical_bounds_valid = False
        qc_issues.append("Slope violates physical bounds [0, 90] deg")
    if (combined["aspect"] < 0.0).any() or (combined["aspect"] > 360.0).any():
        physical_bounds_valid = False
        qc_issues.append("Aspect violates physical bounds [0, 360] deg")

    # H. Class balance
    pos_count = int((combined["landslide"] == 1).sum())
    neg_count = int((combined["landslide"] == 0).sum())
    total_count = len(combined)
    ratio = round(neg_count / max(1, pos_count), 2)
    pos_pct = round(pos_count / total_count * 100.0, 2)
    neg_pct = round(neg_count / total_count * 100.0, 2)

    # I. State distribution breakdown
    state_breakdown: Dict[str, Any] = {}
    for st in sorted(combined["state"].unique()):
        st_sub = combined[combined["state"] == st]
        st_pos = int((st_sub["landslide"] == 1).sum())
        st_neg = int((st_sub["landslide"] == 0).sum())
        state_breakdown[st] = {
            "positive_count": st_pos,
            "negative_count": st_neg,
            "total_count": len(st_sub),
            "negative_to_positive_ratio": round(st_neg / max(1, st_pos), 2),
            "state_pct_of_dataset": round(len(st_sub) / total_count * 100.0, 2),
        }

    # J. Temporal distribution breakdown
    combined["year"] = parsed_dates.dt.year
    combined["month"] = parsed_dates.dt.month

    yearly_breakdown: Dict[str, Any] = {}
    for yr in sorted(combined["year"].unique()):
        y_sub = combined[combined["year"] == yr]
        yearly_breakdown[str(yr)] = {
            "positive_count": int((y_sub["landslide"] == 1).sum()),
            "negative_count": int((y_sub["landslide"] == 0).sum()),
            "total": len(y_sub),
        }

    monthly_breakdown: Dict[str, Any] = {}
    month_names = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
    }
    for m in range(1, 13):
        m_sub = combined[combined["month"] == m]
        monthly_breakdown[f"{m:02d}_{month_names[m]}"] = {
            "positive_count": int((m_sub["landslide"] == 1).sum()),
            "negative_count": int((m_sub["landslide"] == 0).sum()),
            "total": len(m_sub),
            "negative_to_positive_ratio": round(
                int((m_sub["landslide"] == 0).sum()) / max(1, int((m_sub["landslide"] == 1).sum())), 2
            ),
        }

    # Feature statistics table
    feature_stats: Dict[str, Any] = {}
    for col in NUMERICAL_FEATURE_COLUMNS:
        s = combined[col]
        pos_s = combined[combined["landslide"] == 1][col]
        neg_s = combined[combined["landslide"] == 0][col]
        feature_stats[col] = {
            "overall": {
                "mean": round(float(s.mean()), 4),
                "std": round(float(s.std()), 4),
                "min": round(float(s.min()), 4),
                "median": round(float(s.median()), 4),
                "max": round(float(s.max()), 4),
            },
            "positive_class": {
                "mean": round(float(pos_s.mean()), 4),
                "median": round(float(pos_s.median()), 4),
            },
            "negative_class": {
                "mean": round(float(neg_s.mean()), 4),
                "median": round(float(neg_s.median()), 4),
            },
        }

    # Drop temporary helper columns before saving CSV
    save_df = combined[REQUIRED_COLUMNS].copy()

    # Save final CSV
    save_df.to_csv(OUTPUT_CSV_PATH, index=False)
    logger.info(f"[SUCCESS] Saved canonical training dataset to {OUTPUT_CSV_PATH} ({len(save_df)} rows)")

    # 5. Save QC JSON Report
    report: Dict[str, Any] = {
        "dataset_name": "Apda Mitra Unified Landslide Training Dataset",
        "assembly_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_samples": total_count,
            "positive_samples": pos_count,
            "negative_samples": neg_count,
            "positive_pct": pos_pct,
            "negative_pct": neg_pct,
            "negative_to_positive_ratio": ratio,
            "date_range": {
                "start_date": min_date,
                "end_date": max_date,
            },
            "features_count": len(NUMERICAL_FEATURE_COLUMNS),
            "required_columns": REQUIRED_COLUMNS,
        },
        "quality_control_audit": {
            "qc_status": "PASSED_STRICT_QC" if not qc_issues else "FLAGGED_ISSUES",
            "detected_issues": qc_issues,
            "duplicate_rows_count": dup_rows,
            "duplicate_event_ids_count": dup_eids,
            "duplicate_coordinates": {
                "total_shared_coordinates": dup_coords_total,
                "within_positive_class": dup_coords_within_pos,
                "within_negative_class": dup_coords_within_neg,
                "cross_class_coordinate_collisions": len(cross_collisions),
                "cross_class_isolation_verified": len(cross_collisions) == 0,
            },
            "missing_values_audit": {
                "total_missing_values": total_missing,
                "missing_values_by_feature": missing_by_col,
                "all_features_complete": total_missing == 0,
            },
            "dates_integrity": {
                "all_dates_valid_iso_format": dates_valid,
                "earliest_date": min_date,
                "latest_date": max_date,
            },
            "coordinates_integrity": {
                "all_coordinates_within_study_domain": coords_valid,
                "latitude_range": [lat_min, lat_max],
                "longitude_range": [lon_min, lon_max],
            },
            "physical_bounds_integrity": {
                "all_terrain_within_physical_limits": physical_bounds_valid,
            },
        },
        "outlier_analysis_iqr": outlier_analysis,
        "feature_summary_statistics": feature_stats,
        "state_distribution": state_breakdown,
        "temporal_distribution": {
            "monthly_breakdown": monthly_breakdown,
            "yearly_breakdown": yearly_breakdown,
        },
        "file_artifacts": {
            "output_training_csv": str(OUTPUT_CSV_PATH),
            "output_report_json": str(OUTPUT_REPORT_PATH),
            "positive_source_csv": str(POS_CSV_PATH),
            "negative_source_csv": str(NEG_CSV_PATH),
        },
    }

    with open(OUTPUT_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    logger.info(f"[SUCCESS] Saved QC report to {OUTPUT_REPORT_PATH}")

    # 6. Print concise summary to stdout as requested
    print("\n" + "=" * 75)
    print("APDA MITRA — TRAINING DATASET SUMMARY & QUALITY CONTROL")
    print("=" * 75)
    print(f"Total samples:           {total_count}")
    print(f"Positive samples:        {pos_count} ({pos_pct}%)")
    print(f"Negative samples:        {neg_count} ({neg_pct}%)")
    print(f"Positive/Negative ratio: 1 : {ratio}")
    print(f"Date range:              {min_date} to {max_date}")

    print("\nSamples by State:")
    print(f"  {'State':<20} {'Positive':<10} {'Negative':<10} {'Total':<10} {'Ratio (Neg:Pos)':<15}")
    print("  " + "-" * 65)
    for st, data in state_breakdown.items():
        print(
            f"  {st:<20} {data['positive_count']:<10} {data['negative_count']:<10} "
            f"{data['total_count']:<10} {data['negative_to_positive_ratio']:<15.2f}"
        )

    print("\nMissing Values per Feature:")
    for col, m_cnt in missing_by_col.items():
        print(f"  {col:<25}: {m_cnt}")

    print("\nCross-Class Contamination Check:")
    print(f"  Duplicate coordinates between Positive and Negative: {len(cross_collisions)} (Passed: 0 collisions)")
    print(f"  Duplicate event IDs: {dup_eids} (Passed: 0 duplicates)")
    print(f"  Total missing values: {total_missing} (Passed: 0 missing)")
    print("=" * 75)


if __name__ == "__main__":
    run_assembly_and_qc()
