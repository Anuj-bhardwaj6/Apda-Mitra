"""
Model Training — XGBoost Landslide Classifier
===============================================
Trains a production XGBoostClassifier for NER India landslide binary
prediction. Implements:
  - Stratified Train/Val/Test split (70/15/15)
  - Class imbalance handling via scale_pos_weight
  - Early stopping on validation AUCPR
  - Feature importance extraction
  - MLflow experiment tracking
  - Model artifact persistence

Run this script to train the model from the processed training dataset.
"""

from __future__ import annotations

import json
import shutil
import time
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

try:
    import mlflow
    import mlflow.xgboost
    HAS_MLFLOW = True
except ImportError:
    HAS_MLFLOW = False

    class _DummyRun:
        info = type("info", (), {"run_id": "local_run"})()
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    class _DummyMLFlow:
        def set_tracking_uri(self, *a, **kw):
            pass
        def set_experiment(self, *a, **kw):
            pass
        def start_run(self, *a, **kw):
            return _DummyRun()
        def log_params(self, *a, **kw):
            pass
        def log_param(self, *a, **kw):
            pass
        def log_metric(self, *a, **kw):
            pass
        def log_artifact(self, *a, **kw):
            pass
        xgboost = type("xgboost", (), {"log_model": lambda *a, **kw: None})()

    mlflow = _DummyMLFlow()

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    DEFAULT_XGB_PARAMS,
    EARLY_STOPPING_ROUNDS,
    FEATURE_COLUMNS,
    FEATURE_LIST_FILENAME,
    LATEST_MODEL_DIR,
    METADATA_DIR,
    MLFLOW_EXPERIMENT_NAME,
    MLFLOW_TRACKING_URI,
    MODEL_FILENAME,
    MODEL_MANIFEST_FILENAME,
    MODELS_DIR,
    TARGET_COLUMN,
    TRAIN_TEST_VAL_SPLIT,
    TRAINING_CONFIG_FILENAME,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("training.train")


def _load_training_data() -> tuple[pd.DataFrame, pd.Series]:
    """Loads the scaled training dataset and returns X, y."""
    scaled_path = TRAINING_DIR / "training_dataset_scaled.parquet"
    raw_path = TRAINING_DIR / "training_dataset.parquet"

    if scaled_path.exists():
        log.info("Loading scaled training dataset", path=str(scaled_path))
        df = pd.read_parquet(scaled_path)
    elif raw_path.exists():
        log.warning("Scaled dataset not found — loading raw and running transform")
        from scripts.etl.transform import transform
        X, y = transform(input_path=raw_path, fit_scaler=True)
        return X, y
    else:
        raise FileNotFoundError(
            "No training dataset found. Run the full ETL pipeline first:\n"
            "  python scripts/download/download_nasa.py\n"
            "  python scripts/etl/clean.py\n"
            "  python scripts/etl/merge.py\n"
            "  python scripts/etl/transform.py"
        )

    feature_cols = [c for c in FEATURE_COLUMNS if c in df.columns]
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLUMNS].fillna(0)
    y = df[TARGET_COLUMN].astype(int)
    return X, y


def _compute_scale_pos_weight(y_train: pd.Series) -> float:
    """
    Computes XGBoost scale_pos_weight to handle class imbalance.
    scale_pos_weight = count(negative) / count(positive)
    """
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    weight = n_neg / max(n_pos, 1)
    log.info("Class weights computed", n_positive=int(n_pos), n_negative=int(n_neg), scale_pos_weight=round(weight, 3))
    return float(weight)


def _split_data(
    X: pd.DataFrame,
    y: pd.Series,
    train_frac: float = TRAIN_TEST_VAL_SPLIT[0],
    val_frac: float = TRAIN_TEST_VAL_SPLIT[1],
) -> tuple:
    """Stratified 70/15/15 train/val/test split."""
    test_frac = 1.0 - train_frac - val_frac

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=(val_frac + test_frac), stratify=y, random_state=42
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=test_frac / (val_frac + test_frac), stratify=y_temp, random_state=42
    )

    log.info("Data split complete",
             train=len(X_train), val=len(X_val), test=len(X_test))
    return X_train, X_val, X_test, y_train, y_val, y_test


def _save_artifacts(
    model: XGBClassifier,
    params: dict,
    feature_list: list[str],
    version: str,
) -> Path:
    """
    Saves model artifacts to a versioned directory and updates the 'latest' symlink.

    Saved files:
      - model.joblib
      - scaler.joblib (already saved by transform.py)
      - feature_list.json
      - training_config.json
      - model_manifest.json
    """
    # Create versioned directory
    version_dir = MODELS_DIR / version
    version_dir.mkdir(parents=True, exist_ok=True)

    # Save model
    model_path = version_dir / MODEL_FILENAME
    joblib.dump(model, model_path)
    log.info("Model saved", path=str(model_path))

    # Copy scaler from latest (it was fitted during transform.py)
    scaler_src = LATEST_MODEL_DIR / "scaler.joblib"
    if scaler_src.exists():
        shutil.copy(scaler_src, version_dir / "scaler.joblib")

    # Feature list
    feature_path = version_dir / FEATURE_LIST_FILENAME
    with open(feature_path, "w") as f:
        json.dump({"features": feature_list, "n_features": len(feature_list)}, f, indent=2)

    # Training config
    config_path = version_dir / TRAINING_CONFIG_FILENAME
    with open(config_path, "w") as f:
        json.dump({
            "params": params,
            "version": version,
            "trained_at": datetime.utcnow().isoformat(),
            "feature_count": len(feature_list),
        }, f, indent=2)

    # Model manifest (for integrity checking)
    import hashlib
    with open(model_path, "rb") as f:
        model_hash = hashlib.sha256(f.read()).hexdigest()

    manifest = {
        "version": version,
        "model_file": MODEL_FILENAME,
        "sha256": model_hash,
        "trained_at": datetime.utcnow().isoformat(),
        "n_features": len(feature_list),
    }
    with open(version_dir / MODEL_MANIFEST_FILENAME, "w") as f:
        json.dump(manifest, f, indent=2)

    # Update 'latest' symlink → copy all files to latest dir
    for src_file in version_dir.iterdir():
        dest = LATEST_MODEL_DIR / src_file.name
        shutil.copy2(str(src_file), str(dest))

    log.info("Latest artifacts updated", version=version, dir=str(LATEST_MODEL_DIR))
    return version_dir


def train(params: dict = None, save: bool = True) -> dict:
    """
    Main training function.

    Args:
        params: XGBoost parameters (defaults to DEFAULT_XGB_PARAMS + Optuna best if available)
        save: Whether to persist model artifacts

    Returns:
        Dict with model, metrics, and artifact paths
    """
    log.info("=== TRAINING PIPELINE START ===")
    start_time = time.time()

    # Load data
    X, y = _load_training_data()
    log.info("Training data loaded", n_samples=len(X), n_features=len(X.columns))

    # Split
    X_train, X_val, X_test, y_train, y_val, y_test = _split_data(X, y)

    # Load best Optuna params if available, merge with defaults
    optuna_path = METADATA_DIR / "optuna_best_params.json"
    if optuna_path.exists() and params is None:
        with open(optuna_path) as f:
            optuna_params = json.load(f)
        params = {**DEFAULT_XGB_PARAMS, **optuna_params}
        log.info("Loaded Optuna best parameters", n_params=len(optuna_params))
    elif params is None:
        params = DEFAULT_XGB_PARAMS.copy()
        log.info("Using default XGBoost parameters")

    # Adjust scale_pos_weight for class imbalance
    params["scale_pos_weight"] = _compute_scale_pos_weight(y_train)

    # Setup MLflow
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)

    version = datetime.utcnow().strftime("v%Y%m%d_%H%M%S")

    with mlflow.start_run(run_name=f"landslide_train_{version}") as run:
        mlflow.log_params(params)
        mlflow.log_param("n_train", len(X_train))
        mlflow.log_param("n_val", len(X_val))
        mlflow.log_param("n_test", len(X_test))
        mlflow.log_param("n_features", len(FEATURE_COLUMNS))
        mlflow.log_param("version", version)

        # Build model
        model_params = {k: v for k, v in params.items()
                        if k not in ["n_estimators"]}  # passed separately
        model = XGBClassifier(
            **model_params,
            n_estimators=params.get("n_estimators", 500),
            early_stopping_rounds=EARLY_STOPPING_ROUNDS,
        )

        # Train with early stopping
        log.info("Fitting XGBClassifier", n_estimators=params.get("n_estimators"))
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        best_iteration = model.best_iteration
        log.info("Training complete", best_iteration=best_iteration)
        mlflow.log_metric("best_iteration", best_iteration)

        # Evaluate on test set
        from scripts.training.evaluate import evaluate_model
        metrics = evaluate_model(model, X_test, y_test, split_name="test")

        # Log metrics to MLflow
        for metric_name, metric_val in metrics.items():
            if isinstance(metric_val, (int, float)):
                mlflow.log_metric(metric_name, metric_val)

        # Feature importance
        importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
        sorted_importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        importance_path = LATEST_MODEL_DIR / "feature_importance.json"
        with open(importance_path, "w") as f:
            json.dump(sorted_importance, f, indent=2)
        mlflow.log_artifact(str(importance_path))

        # Save artifacts
        if save:
            artifact_dir = _save_artifacts(
                model=model,
                params=params,
                feature_list=FEATURE_COLUMNS,
                version=version,
            )

            # Save metrics
            metrics_path = LATEST_MODEL_DIR / "metrics.json"
            with open(metrics_path, "w") as f:
                json.dump({
                    "version": version,
                    "test_metrics": metrics,
                    "trained_at": datetime.utcnow().isoformat(),
                    "training_duration_sec": round(time.time() - start_time, 1),
                }, f, indent=2)
            mlflow.log_artifact(str(metrics_path))

            # Log model to MLflow
            mlflow.xgboost.log_model(model, artifact_path="model")

        run_id = run.info.run_id

    duration = round(time.time() - start_time, 1)
    log.info("=== TRAINING COMPLETE ===",
             version=version, roc_auc=metrics.get("roc_auc"), duration_sec=duration)

    return {
        "model": model,
        "version": version,
        "metrics": metrics,
        "mlflow_run_id": run_id,
        "duration_sec": duration,
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train XGBoost landslide prediction model")
    parser.add_argument("--no-save", action="store_true", help="Train but don't save artifacts")
    args = parser.parse_args()

    result = train(save=not args.no_save)
    print(f"\n✅ Training complete!")
    print(f"   Version:      {result['version']}")
    print(f"   Duration:     {result['duration_sec']}s")
    print(f"   ROC AUC:      {result['metrics'].get('roc_auc', 'N/A'):.4f}")
    print(f"   F1 Score:     {result['metrics'].get('f1_score', 'N/A'):.4f}")
    print(f"   MLflow Run:   {result['mlflow_run_id']}")
