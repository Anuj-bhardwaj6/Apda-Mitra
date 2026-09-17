"""
Continuous Learning — Landslide Model Retraining Pipeline
===========================================================
Periodically or on-demand assimilates newly verified citizen incident reports
from Apda Mitra into the training corpus, retrains the XGBoost model,
evaluates against the incumbent production baseline, and executes automatic
rollback if metrics degrade beyond ROLLBACK_METRIC_TOLERANCE.

Key Workflow:
  1. Extract verified LANDSLIDE reports from incident_reports table.
  2. Assemble environmental feature vectors (terrain, weather, proximity).
  3. Merge with base training dataset.
  4. Retrain candidate model with MLflow experiment tracking.
  5. Evaluate candidate vs incumbent production model.
  6. Promote candidate to 'latest' OR rollback & issue alert.
  7. Provide thread-safe asynchronous job scheduling & status tracking.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    FEATURE_COLUMNS,
    LATEST_MODEL_DIR,
    METRICS_FILENAME,
    MODELS_DIR,
    RETRAIN_MIN_SAMPLES,
    ROLLBACK_METRIC_TOLERANCE,
    TARGET_COLUMN,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger
from ai.scripts.deployment.load_model import get_model_manager

log = PipelineLogger("training.retrain_pipeline")

# In-memory retrain job registry
_JOB_REGISTRY: Dict[str, Dict[str, Any]] = {}
_REGISTRY_LOCK = threading.Lock()


def _fetch_verified_reports_from_db(db_session: Any) -> pd.DataFrame:
    """Queries verified landslide citizen reports from database."""
    if db_session is None:
        return pd.DataFrame()

    try:
        query = """
            SELECT
                id,
                latitude,
                longitude,
                created_at,
                description,
                severity
            FROM incident_reports
            WHERE
                verified = true
                AND (disaster_type = 'LANDSLIDE' OR hazard_type = 'LANDSLIDE')
            ORDER BY created_at ASC
        """
        result = db_session.execute(query)
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()

        data = []
        for r in rows:
            data.append({
                "report_id": str(r[0]),
                "latitude": float(r[1]),
                "longitude": float(r[2]),
                "timestamp": str(r[3]),
                "severity": str(r[5]) if len(r) > 5 else "HIGH",
            })
        return pd.DataFrame(data)
    except Exception as exc:
        log.warning("Could not query incident_reports from DB; check connection", error=str(exc))
        return pd.DataFrame()


def assimilate_new_samples(
    db_session: Any = None,
    synthetic_count: int = 0,
) -> pd.DataFrame:
    """
    Extracts new verified landslide reports and constructs full feature vectors.
    """
    from ai.scripts.training.predict import assemble_features_for_point

    df_reports = _fetch_verified_reports_from_db(db_session)

    if len(df_reports) == 0 and synthetic_count > 0:
        log.info("Generating synthetic verification samples for pipeline dry-run", count=synthetic_count)
        # Synthetic verified incidents around landslide corridors (e.g. Sikkim / Assam hill tracts)
        rng = pd.date_range(end=pd.Timestamp.now(), periods=synthetic_count)
        samples = []
        for i, dt in enumerate(rng):
            lat = 27.20 + (i * 0.03) % 0.8
            lon = 88.40 + (i * 0.04) % 0.8
            samples.append({
                "latitude": lat,
                "longitude": lon,
                "timestamp": dt.isoformat(),
            })
        df_reports = pd.DataFrame(samples)

    if len(df_reports) == 0:
        return pd.DataFrame()

    log.info("Compiling feature vectors for new reports", count=len(df_reports))
    feature_rows = []
    for _, row in df_reports.iterrows():
        lat = float(row["latitude"])
        lon = float(row["longitude"])
        feats = assemble_features_for_point(lat, lon)
        feats[TARGET_COLUMN] = 1  # Verified positive landslide event
        feature_rows.append(feats)

    return pd.DataFrame(feature_rows)


def run_retraining_workflow(
    min_samples: int = RETRAIN_MIN_SAMPLES,
    force: bool = False,
    db_session: Any = None,
) -> Dict[str, Any]:
    """
    Executes the full automated retraining & model evaluation loop.
    """
    start_time = time.time()
    log.info("=== RETRAINING PIPELINE INITIATED ===", min_samples=min_samples, force=force)

    # 1. Check current incumbent production model metrics
    mgr = get_model_manager()
    incumbent_meta = mgr.get_metadata()
    incumbent_version = incumbent_meta.get("version", "v_baseline")
    incumbent_metrics = incumbent_meta.get("metrics", {}).get("test_metrics", {})
    incumbent_auc = float(incumbent_metrics.get("roc_auc", 0.85))

    # 2. Extract new data points
    new_data = assimilate_new_samples(db_session=db_session, synthetic_count=0 if not force else 10)
    new_sample_count = len(new_data)

    if new_sample_count < min_samples and not force:
        msg = f"Insufficient new verified samples ({new_sample_count} < {min_samples}). Retraining skipped."
        log.info(msg)
        return {
            "status": "SKIPPED",
            "message": msg,
            "new_samples_count": new_sample_count,
            "current_version": incumbent_version,
            "duration_sec": round(time.time() - start_time, 2),
        }

    # 3. Merge new samples into training corpus
    training_file = TRAINING_DIR / "training_dataset.parquet"
    if training_file.exists() and len(new_data) > 0:
        try:
            existing_df = pd.read_parquet(training_file)
            combined_df = pd.concat([existing_df, new_data], ignore_index=True)
            combined_df.to_parquet(training_file, index=False)
            log.info("Appended new records to training dataset", new_total=len(combined_df))

            # Trigger transform
            from ai.scripts.etl.transform import transform
            transform(input_path=training_file, fit_scaler=True)
        except Exception as exc:
            log.error("Failed to update training parquet file", error=str(exc))
    elif not training_file.exists():
        log.warning("Base training dataset not found; running train on available records")

    # 4. Train candidate model
    from ai.scripts.training.train import train
    try:
        train_result = train(save=True)
        candidate_version = train_result["version"]
        candidate_metrics = train_result["metrics"]
        candidate_auc = float(candidate_metrics.get("roc_auc", 0.0))
    except Exception as exc:
        log.error("Candidate training crashed", error=str(exc))
        return {
            "status": "FAILED",
            "message": f"Training failed: {str(exc)}",
            "current_version": incumbent_version,
            "duration_sec": round(time.time() - start_time, 2),
        }

    # 5. Automated Rollback & Promotion Logic
    # If candidate AUC dropped by more than ROLLBACK_METRIC_TOLERANCE, rollback!
    auc_diff = candidate_auc - incumbent_auc
    log.info(
        "Candidate vs Incumbent Performance",
        candidate_auc=candidate_auc,
        incumbent_auc=incumbent_auc,
        delta=round(auc_diff, 4),
    )

    if auc_diff < -ROLLBACK_METRIC_TOLERANCE:
        # ROLLBACK
        log.warning(
            "ALERT: Candidate model performance degraded beyond tolerance! Executing automatic rollback.",
            candidate_auc=candidate_auc,
            incumbent_auc=incumbent_auc,
            tolerance=ROLLBACK_METRIC_TOLERANCE,
        )

        # Restore latest files from incumbent version if exists
        incumbent_dir = MODELS_DIR / incumbent_version
        if incumbent_dir.exists() and incumbent_version != candidate_version:
            import shutil
            for f in incumbent_dir.iterdir():
                shutil.copy2(str(f), str(LATEST_MODEL_DIR / f.name))
            mgr.reload()

        return {
            "status": "ROLLED_BACK",
            "message": f"Candidate {candidate_version} degraded AUC by {auc_diff:.4f}. Restored {incumbent_version}.",
            "current_version": incumbent_version,
            "candidate_version": candidate_version,
            "metrics_comparison": {
                "incumbent_roc_auc": incumbent_auc,
                "candidate_roc_auc": candidate_auc,
                "delta": round(auc_diff, 4),
            },
            "duration_sec": round(time.time() - start_time, 2),
        }

    # PROMOTION SUCCESSFUL
    mgr.reload()
    msg = f"Candidate model {candidate_version} successfully promoted to production (AUC: {candidate_auc:.4f}, Delta: +{auc_diff:.4f})."
    log.info(msg)

    return {
        "status": "COMPLETED",
        "message": msg,
        "current_version": candidate_version,
        "previous_version": incumbent_version,
        "metrics_comparison": {
            "previous_roc_auc": incumbent_auc,
            "new_roc_auc": candidate_auc,
            "delta": round(auc_diff, 4),
        },
        "duration_sec": round(time.time() - start_time, 2),
    }


def dispatch_retraining_job(
    min_samples: int = RETRAIN_MIN_SAMPLES,
    force: bool = False,
    db_session: Any = None,
) -> Dict[str, Any]:
    """Spawns an asynchronous retraining task in a background daemon thread."""
    job_id = f"retrain_{uuid.uuid4().hex[:10]}"
    mgr = get_model_manager()

    status_obj = {
        "job_id": job_id,
        "status": "RUNNING",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "current_version": mgr.get_version(),
        "previous_version": None,
        "metrics_comparison": None,
        "message": "Retraining job queued and running in background.",
    }

    with _REGISTRY_LOCK:
        _JOB_REGISTRY[job_id] = status_obj

    def _worker():
        try:
            res = run_retraining_workflow(min_samples=min_samples, force=force, db_session=db_session)
            with _REGISTRY_LOCK:
                status_obj["status"] = res.get("status", "COMPLETED")
                status_obj["completed_at"] = datetime.now(timezone.utc).isoformat()
                status_obj["current_version"] = res.get("current_version", mgr.get_version())
                status_obj["previous_version"] = res.get("previous_version")
                status_obj["metrics_comparison"] = res.get("metrics_comparison")
                status_obj["message"] = res.get("message", "Completed")
        except Exception as exc:
            with _REGISTRY_LOCK:
                status_obj["status"] = "FAILED"
                status_obj["completed_at"] = datetime.now(timezone.utc).isoformat()
                status_obj["message"] = f"Retraining job error: {str(exc)}"

    t = threading.Thread(target=_worker, daemon=True)
    t.start()

    return status_obj


def get_retraining_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieves the status dictionary of a tracked retrain job."""
    with _REGISTRY_LOCK:
        if job_id in _JOB_REGISTRY:
            return _JOB_REGISTRY[job_id]

    mgr = get_model_manager()
    return {
        "job_id": job_id,
        "status": "UNKNOWN",
        "started_at": None,
        "completed_at": None,
        "current_version": mgr.get_version(),
        "previous_version": None,
        "metrics_comparison": None,
        "message": f"No active or historical retrain job found with ID {job_id}",
    }
