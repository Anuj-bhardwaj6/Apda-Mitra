"""
Model Training — Optuna Hyperparameter Search
===============================================
Uses Optuna TPE sampler to tune XGBoost hyperparameters via stratified
5-fold cross-validation. Maximises ROC AUC on the validation fold.

Search space covers 9 key XGBoost hyperparameters.
Best parameters are saved to datasets/metadata/optuna_best_params.json
and logged to MLflow.

Run BEFORE train.py to get optimal parameters:
    python scripts/training/hyperparameter_search.py
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import mlflow
import numpy as np
import optuna
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import (
    DEFAULT_XGB_PARAMS,
    FEATURE_COLUMNS,
    METADATA_DIR,
    MLFLOW_EXPERIMENT_NAME,
    MLFLOW_TRACKING_URI,
    N_CV_FOLDS,
    OPTUNA_N_TRIALS,
    OPTUNA_TIMEOUT_SECONDS,
    TARGET_COLUMN,
    TRAINING_DIR,
)
from ai.logger import PipelineLogger

log = PipelineLogger("training.hyperparameter_search")

optuna.logging.set_verbosity(optuna.logging.WARNING)


def _load_data() -> tuple[pd.DataFrame, pd.Series]:
    """Loads training data for hyperparameter search."""
    parquet_path = TRAINING_DIR / "training_dataset_scaled.parquet"
    if not parquet_path.exists():
        parquet_path = TRAINING_DIR / "training_dataset.parquet"
    if not parquet_path.exists():
        raise FileNotFoundError("Training dataset not found. Run ETL pipeline first.")

    df = pd.read_parquet(parquet_path)
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    X = df[FEATURE_COLUMNS].fillna(0)
    y = df[TARGET_COLUMN].astype(int)
    return X, y


def _objective(trial: optuna.Trial, X: pd.DataFrame, y: pd.Series) -> float:
    """
    Optuna objective function: stratified K-fold cross-validation,
    returns mean ROC AUC across folds.
    """
    n_neg = (y == 0).sum()
    n_pos = (y == 1).sum()
    scale_pos_weight = n_neg / max(n_pos, 1)

    params = {
        "objective": "binary:logistic",
        "eval_metric": "aucpr",
        "tree_method": "hist",
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 20),
        "gamma": trial.suggest_float("gamma", 0.0, 5.0),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
        "scale_pos_weight": scale_pos_weight,
        "random_state": 42,
        "n_jobs": -1,
        "verbosity": 0,
    }

    cv = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=42)
    auc_scores: list[float] = []

    for fold, (train_idx, val_idx) in enumerate(cv.split(X, y)):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = XGBClassifier(**params)
        model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)

        y_prob = model.predict_proba(X_val)[:, 1]
        auc = roc_auc_score(y_val, y_prob)
        auc_scores.append(auc)

    mean_auc = float(np.mean(auc_scores))

    # Log each trial to MLflow as child run
    with mlflow.start_run(nested=True, run_name=f"trial_{trial.number}"):
        mlflow.log_params({k: v for k, v in params.items() if k not in ["objective", "eval_metric", "tree_method"]})
        mlflow.log_metric("mean_cv_roc_auc", mean_auc)
        mlflow.log_metric("std_cv_roc_auc", float(np.std(auc_scores)))

    return mean_auc


def search(n_trials: int = OPTUNA_N_TRIALS, timeout: int = OPTUNA_TIMEOUT_SECONDS) -> dict:
    """
    Runs Optuna hyperparameter search.

    Args:
        n_trials: Maximum number of Optuna trials
        timeout: Maximum time in seconds

    Returns:
        Dict with best_params and best_value
    """
    log.info("=== HYPERPARAMETER SEARCH START ===", n_trials=n_trials, timeout_sec=timeout)

    X, y = _load_data()
    log.info("Data loaded", n_samples=len(X), n_features=len(X.columns))

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)

    study = optuna.create_study(
        direction="maximize",
        sampler=optuna.samplers.TPESampler(seed=42),
        pruner=optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=5),
    )

    with mlflow.start_run(run_name=f"optuna_search_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"):
        mlflow.log_param("n_trials_requested", n_trials)
        mlflow.log_param("timeout_sec", timeout)

        study.optimize(
            lambda trial: _objective(trial, X, y),
            n_trials=n_trials,
            timeout=timeout,
            show_progress_bar=True,
            n_jobs=1,  # Set >1 only if thread-safe
        )

        best_params = study.best_params
        best_value = study.best_value

        log.info("Optuna search complete",
                 best_roc_auc=round(best_value, 4),
                 n_trials_completed=len(study.trials))

        # Save best params
        output: dict = {
            **best_params,
            "objective": "binary:logistic",
            "eval_metric": "aucpr",
            "tree_method": "hist",
            "n_jobs": -1,
            "random_state": 42,
            "verbosity": 0,
        }
        params_path = METADATA_DIR / "optuna_best_params.json"
        with open(params_path, "w") as f:
            json.dump(output, f, indent=2)
        log.info("Best params saved", path=str(params_path))

        mlflow.log_params(best_params)
        mlflow.log_metric("best_cv_roc_auc", best_value)
        mlflow.log_artifact(str(params_path))

    return {"best_params": best_params, "best_value": best_value}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run Optuna hyperparameter search")
    parser.add_argument("--trials", type=int, default=OPTUNA_N_TRIALS)
    parser.add_argument("--timeout", type=int, default=OPTUNA_TIMEOUT_SECONDS)
    args = parser.parse_args()

    result = search(n_trials=args.trials, timeout=args.timeout)
    print(f"\n✅ Best ROC AUC: {result['best_value']:.4f}")
    print(f"Best params:")
    for k, v in result["best_params"].items():
        print(f"  {k}: {v}")
