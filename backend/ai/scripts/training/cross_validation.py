"""
Model Training — Cross-Validation Pipeline
===========================================
Performs Stratified K-Fold Cross-Validation for the XGBoost landslide prediction model.
Evaluates model stability, generalization, and per-fold performance across NER India data.

Outputs:
  - Per-fold metrics (ROC AUC, PR AUC, F1, Precision, Recall, Accuracy, Brier score)
  - Mean +/- std across all folds
  - MLflow CV summary logging
  - JSON report saved to datasets/artifacts/cv_results.json
"""

from __future__ import annotations

import argparse
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    import mlflow
    HAS_MLFLOW = True
except ImportError:
    HAS_MLFLOW = False

    class _DummyRun:
        info = type("info", (), {"run_id": "local_cv_run"})()

    class _DummyMLFlow:
        def set_tracking_uri(self, *a, **kw):
            pass
        def set_experiment(self, *a, **kw):
            pass
        def start_run(self, *a, **kw):
            return _DummyRun()
        def log_params(self, *a, **kw):
            pass
        def log_metric(self, *a, **kw):
            pass
        def log_artifact(self, *a, **kw):
            pass
        def end_run(self, *a, **kw):
            pass

    mlflow = _DummyMLFlow()

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    ARTIFACTS_DIR,
    DEFAULT_XGB_PARAMS,
    EARLY_STOPPING_ROUNDS,
    FEATURE_COLUMNS,
    METADATA_DIR,
    MLFLOW_EXPERIMENT_NAME,
    MLFLOW_TRACKING_URI,
    TARGET_COLUMN,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("training.cross_validation")


def _load_data() -> tuple[pd.DataFrame, pd.Series]:
    """Loads feature matrix and target from scaled training dataset."""
    scaled_path = TRAINING_DIR / "training_dataset_scaled.parquet"
    raw_path = TRAINING_DIR / "training_dataset.parquet"

    if scaled_path.exists():
        log.info("Loading scaled training dataset", path=str(scaled_path))
        df = pd.read_parquet(scaled_path)
    elif raw_path.exists():
        log.warning("Scaled dataset not found, falling back to raw training dataset")
        from scripts.etl.transform import transform
        X, y = transform(input_path=raw_path, fit_scaler=True)
        return X, y
    else:
        raise FileNotFoundError(
            "No training dataset found. Please run the data ingestion and ETL pipeline first."
        )

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLUMNS].fillna(0)
    y = df[TARGET_COLUMN].astype(int)
    return X, y


def run_cross_validation(
    n_splits: int = 5,
    params: dict[str, Any] | None = None,
    log_mlflow: bool = True,
) -> dict[str, Any]:
    """
    Executes Stratified K-Fold CV.

    Args:
        n_splits: Number of folds (default: 5)
        params: XGBoost parameters override
        log_mlflow: Whether to track runs in MLflow

    Returns:
        Dictionary containing per-fold metrics, mean, and std.
    """
    log.info("=== CROSS-VALIDATION PIPELINE START ===", n_splits=n_splits)
    start_time = time.time()

    X, y = _load_data()
    n_samples = len(X)
    n_pos = int((y == 1).sum())
    n_neg = int((y == 0).sum())
    log.info("Dataset loaded", samples=n_samples, positives=n_pos, negatives=n_neg)

    # Resolve parameters
    if params is None:
        optuna_path = METADATA_DIR / "optuna_best_params.json"
        if optuna_path.exists():
            with open(optuna_path) as f:
                optuna_params = json.load(f)
            params = {**DEFAULT_XGB_PARAMS, **optuna_params}
            log.info("Merged Optuna hyperparameter tuning results")
        else:
            params = DEFAULT_XGB_PARAMS.copy()

    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

    fold_metrics: list[dict[str, float]] = []
    run_id: str | None = None

    if log_mlflow:
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
        cv_run = mlflow.start_run(run_name=f"landslide_cv_{n_splits}fold_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
        run_id = cv_run.info.run_id
        mlflow.log_params({**params, "n_splits": n_splits, "n_samples": n_samples})

    try:
        for fold, (train_idx, val_idx) in enumerate(skf.split(X, y), start=1):
            fold_start = time.time()
            X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
            X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

            # Calculate fold scale_pos_weight
            n_fold_neg = (y_train == 0).sum()
            n_fold_pos = max((y_train == 1).sum(), 1)
            scale_pos_weight = float(n_fold_neg / n_fold_pos)

            fold_params = params.copy()
            fold_params["scale_pos_weight"] = scale_pos_weight
            n_est = fold_params.pop("n_estimators", 500)

            model = XGBClassifier(
                **fold_params,
                n_estimators=n_est,
                early_stopping_rounds=EARLY_STOPPING_ROUNDS,
            )

            model.fit(
                X_train,
                y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )

            y_probs = model.predict_proba(X_val)[:, 1]
            y_preds = (y_probs >= 0.5).astype(int)

            metrics = {
                "fold": fold,
                "roc_auc": float(roc_auc_score(y_val, y_probs)),
                "pr_auc": float(average_precision_score(y_val, y_probs)),
                "f1_score": float(f1_score(y_val, y_preds, zero_division=0)),
                "precision": float(precision_score(y_val, y_preds, zero_division=0)),
                "recall": float(recall_score(y_val, y_preds, zero_division=0)),
                "accuracy": float(accuracy_score(y_val, y_preds)),
                "brier_score": float(brier_score_loss(y_val, y_probs)),
                "best_iteration": int(model.best_iteration if hasattr(model, "best_iteration") else n_est),
                "duration_sec": round(time.time() - fold_start, 2),
            }

            fold_metrics.append(metrics)
            log.info(
                f"Fold {fold}/{n_splits} complete",
                roc_auc=round(metrics["roc_auc"], 4),
                pr_auc=round(metrics["pr_auc"], 4),
                f1=round(metrics["f1_score"], 4),
                best_iter=metrics["best_iteration"],
            )

            if log_mlflow:
                for k, v in metrics.items():
                    if k != "fold":
                        mlflow.log_metric(f"fold_{fold}_{k}", v)

    finally:
        pass

    # Aggregations
    metric_keys = ["roc_auc", "pr_auc", "f1_score", "precision", "recall", "accuracy", "brier_score"]
    summary_mean = {f"mean_{k}": float(np.mean([m[k] for m in fold_metrics])) for k in metric_keys}
    summary_std = {f"std_{k}": float(np.std([m[k] for m in fold_metrics])) for k in metric_keys}

    results: dict[str, Any] = {
        "n_splits": n_splits,
        "n_samples": n_samples,
        "features": FEATURE_COLUMNS,
        "timestamp": datetime.utcnow().isoformat(),
        "total_duration_sec": round(time.time() - start_time, 2),
        "folds": fold_metrics,
        "summary": {**summary_mean, **summary_std},
    }

    # Save to disk
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACTS_DIR / "cv_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    log.info("Saved cross-validation results", path=str(out_path))

    if log_mlflow and run_id:
        for k, v in summary_mean.items():
            mlflow.log_metric(k, v)
        for k, v in summary_std.items():
            mlflow.log_metric(k, v)
        mlflow.log_artifact(str(out_path))
        mlflow.end_run()

    log.info(
        "=== CROSS-VALIDATION COMPLETE ===",
        mean_roc_auc=round(summary_mean["mean_roc_auc"], 4),
        std_roc_auc=round(summary_std["std_roc_auc"], 4),
        mean_f1=round(summary_mean["mean_f1_score"], 4),
        total_duration=results["total_duration_sec"],
    )

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Stratified K-Fold CV on Landslide Training Data")
    parser.add_argument("--folds", type=int, default=5, help="Number of folds (default: 5)")
    parser.add_argument("--no-mlflow", action="store_true", help="Disable MLflow tracking")
    args = parser.parse_args()

    res = run_cross_validation(n_splits=args.folds, log_mlflow=not args.no_mlflow)
    print("\n✅ Stratified Cross-Validation Summary:")
    print(f"   Folds: {res['n_splits']}")
    print(f"   Mean ROC AUC: {res['summary']['mean_roc_auc']:.4f} ± {res['summary']['std_roc_auc']:.4f}")
    print(f"   Mean PR AUC:  {res['summary']['mean_pr_auc']:.4f} ± {res['summary']['std_pr_auc']:.4f}")
    print(f"   Mean F1:      {res['summary']['mean_f1_score']:.4f} ± {res['summary']['std_f1_score']:.4f}")
    print(f"   Results file: {ARTIFACTS_DIR / 'cv_results.json'}")
