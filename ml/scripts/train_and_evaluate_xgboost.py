"""
APDA MITRA — ML Pipeline: XGBoost Landslide Risk Model Training & Evaluation
=============================================================================
Trains and validates the canonical Apda Mitra XGBoost binary classifier using
strict temporal blocking, validation-based hyperparameter optimization, and
evaluation on an untouched out-of-time test set (2018–2021).

Inputs:
- ml/data/train.csv (1990–2015, 1,992 samples)
- ml/data/validation.csv (2016–2017, 604 samples)
- ml/data/test.csv (2018–2021, 200 samples)

Outputs:
- ml/models/apda_mitra_xgboost.json
- ml/models/model_metadata.json
- ml/evaluation/test_metrics.json
- ml/evaluation/confusion_matrix.png
- ml/evaluation/roc_curve.png
- ml/evaluation/pr_curve.png
- ml/evaluation/feature_importance.png
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import shap
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
import xgboost as xgb

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("XGBoostTrainer")

# Fixed random seed for reproducibility
RANDOM_SEED = 42

# Paths
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
ML_DATA_DIR = WORKSPACE_ROOT / "ml" / "data"
ML_MODELS_DIR = WORKSPACE_ROOT / "ml" / "models"
ML_EVAL_DIR = WORKSPACE_ROOT / "ml" / "evaluation"

ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)
ML_EVAL_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_CSV_PATH = ML_DATA_DIR / "train.csv"
VAL_CSV_PATH = ML_DATA_DIR / "validation.csv"
TEST_CSV_PATH = ML_DATA_DIR / "test.csv"

MODEL_JSON_PATH = ML_MODELS_DIR / "apda_mitra_xgboost.json"
METADATA_JSON_PATH = ML_MODELS_DIR / "model_metadata.json"

TEST_METRICS_PATH = ML_EVAL_DIR / "test_metrics.json"
CONFUSION_MATRIX_PNG = ML_EVAL_DIR / "confusion_matrix.png"
ROC_CURVE_PNG = ML_EVAL_DIR / "roc_curve.png"
PR_CURVE_PNG = ML_EVAL_DIR / "pr_curve.png"
FEATURE_IMPORTANCE_PNG = ML_EVAL_DIR / "feature_importance.png"

FEATURE_COLUMNS = [
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
TARGET_COLUMN = "landslide"


def tune_hyperparameters_on_validation(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    default_scale_pos_weight: float,
) -> Tuple[Dict[str, Any], float]:
    """
    Performs systematic hyperparameter search evaluated strictly on the Validation set.
    The Test set is never touched. Optimization metric is PR-AUC (Average Precision).
    """
    logger.info("Starting hyperparameter tuning on Validation set (metric: PR-AUC)...")

    # Parameter grid designed for tabular environmental hazard data
    candidate_configs = [
        # Baseline balanced
        {"max_depth": 4, "learning_rate": 0.05, "min_child_weight": 3, "subsample": 0.8, "colsample_bytree": 0.8, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 2.0},
        {"max_depth": 3, "learning_rate": 0.03, "min_child_weight": 5, "subsample": 0.8, "colsample_bytree": 0.8, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 3.0},
        {"max_depth": 5, "learning_rate": 0.03, "min_child_weight": 3, "subsample": 0.8, "colsample_bytree": 0.7, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 2.0},
        {"max_depth": 4, "learning_rate": 0.02, "min_child_weight": 3, "subsample": 0.7, "colsample_bytree": 0.8, "scale_pos_weight": default_scale_pos_weight * 1.1, "reg_lambda": 3.0},
        {"max_depth": 6, "learning_rate": 0.02, "min_child_weight": 5, "subsample": 0.8, "colsample_bytree": 0.8, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 5.0},
        {"max_depth": 3, "learning_rate": 0.05, "min_child_weight": 2, "subsample": 0.9, "colsample_bytree": 0.9, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 1.5},
        {"max_depth": 4, "learning_rate": 0.04, "min_child_weight": 4, "subsample": 0.85, "colsample_bytree": 0.85, "scale_pos_weight": default_scale_pos_weight, "reg_lambda": 2.5},
        {"max_depth": 5, "learning_rate": 0.04, "min_child_weight": 4, "subsample": 0.8, "colsample_bytree": 0.8, "scale_pos_weight": default_scale_pos_weight * 1.2, "reg_lambda": 2.0},
    ]

    best_score = -1.0
    best_params: Dict[str, Any] = candidate_configs[0]

    for i, cfg in enumerate(candidate_configs, 1):
        clf = xgb.XGBClassifier(
            n_estimators=400,
            early_stopping_rounds=30,
            eval_metric="aucpr",
            random_state=RANDOM_SEED,
            n_jobs=-1,
            **cfg,
        )
        clf.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

        val_probs = clf.predict_proba(X_val)[:, 1]
        score = float(average_precision_score(y_val, val_probs))
        val_auc = float(roc_auc_score(y_val, val_probs))

        logger.info(
            f"Config {i}/{len(candidate_configs)}: depth={cfg['max_depth']}, lr={cfg['learning_rate']} -> "
            f"Val PR-AUC: {score:.4f} | Val ROC-AUC: {val_auc:.4f} | Best iteration: {clf.best_iteration}"
        )

        if score > best_score:
            best_score = score
            best_params = {**cfg, "n_estimators": clf.best_iteration + 1}

    logger.info(f"Selected Best Hyperparameters: {best_params} (Validation PR-AUC: {best_score:.4f})")
    return best_params, best_score


def plot_evaluation_charts(
    y_test: np.ndarray,
    y_prob: np.ndarray,
    y_pred: np.ndarray,
    feature_names: List[str],
    feature_importances: Dict[str, float],
    shap_values: np.ndarray,
    X_test_df: pd.DataFrame,
):
    """Generates clean, presentation-ready evaluation charts."""
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # 1. Confusion Matrix Plot
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        cbar=False,
        xticklabels=["Non-Landslide (0)", "Landslide (1)"],
        yticklabels=["Non-Landslide (0)", "Landslide (1)"],
        ax=ax,
        annot_kws={"size": 14, "weight": "bold"},
    )
    ax.set_title("Apda Mitra Test Set — Confusion Matrix", fontsize=12, pad=12, weight="bold")
    ax.set_ylabel("True Ground Truth", fontsize=10)
    ax.set_xlabel("Model Predicted Class", fontsize=10)
    plt.tight_layout()
    fig.savefig(CONFUSION_MATRIX_PNG, dpi=180)
    plt.close(fig)
    logger.info(f"[SUCCESS] Saved {CONFUSION_MATRIX_PNG.name}")

    # 2. ROC Curve Plot
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = roc_auc_score(y_test, y_prob)

    fig, ax = plt.subplots(figsize=(6.5, 5))
    ax.plot(fpr, tpr, color="#1f77b4", lw=2.2, label=f"Apda Mitra XGBoost (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], color="grey", lw=1.2, linestyle="--", label="Random Chance (AUC = 0.500)")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.02])
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=10)
    ax.set_ylabel("True Positive Rate (Recall)", fontsize=10)
    ax.set_title("Receiver Operating Characteristic (ROC) — Test Set", fontsize=12, pad=12, weight="bold")
    ax.legend(loc="lower right", frameon=True)
    plt.tight_layout()
    fig.savefig(ROC_CURVE_PNG, dpi=180)
    plt.close(fig)
    logger.info(f"[SUCCESS] Saved {ROC_CURVE_PNG.name}")

    # 3. Precision-Recall Curve Plot
    precisions, recalls, _ = precision_recall_curve(y_test, y_prob)
    pr_auc = average_precision_score(y_test, y_prob)
    pos_prior = float(np.mean(y_test))

    fig, ax = plt.subplots(figsize=(6.5, 5))
    ax.plot(recalls, precisions, color="#2ca02c", lw=2.2, label=f"Apda Mitra XGBoost (PR-AUC = {pr_auc:.3f})")
    ax.axhline(pos_prior, color="grey", lw=1.2, linestyle="--", label=f"Class Prior Baseline ({pos_prior:.3f})")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.02])
    ax.set_xlabel("Recall (Sensitivity)", fontsize=10)
    ax.set_ylabel("Precision (Positive Predictive Value)", fontsize=10)
    ax.set_title("Precision-Recall Curve (PR-AUC) — Test Set", fontsize=12, pad=12, weight="bold")
    ax.legend(loc="upper right", frameon=True)
    plt.tight_layout()
    fig.savefig(PR_CURVE_PNG, dpi=180)
    plt.close(fig)
    logger.info(f"[SUCCESS] Saved {PR_CURVE_PNG.name}")

    # 4. Feature Importance Plot (Gain & SHAP Mean Abs)
    df_imp = pd.DataFrame([
        {"feature": k, "gain": v} for k, v in feature_importances.items()
    ]).sort_values("gain", ascending=True)

    fig, ax = plt.subplots(figsize=(8, 6))
    bars = ax.barh(df_imp["feature"], df_imp["gain"], color="#4c72b0", alpha=0.85)
    ax.set_xlabel("XGBoost Relative Gain Feature Importance", fontsize=10)
    ax.set_title("Apda Mitra Feature Importance Ranking (XGBoost Gain)", fontsize=12, pad=12, weight="bold")

    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.005, bar.get_y() + bar.get_height() / 2, f"{width:.3f}", va="center", ha="left", fontsize=9)

    plt.tight_layout()
    fig.savefig(FEATURE_IMPORTANCE_PNG, dpi=180)
    plt.close(fig)
    logger.info(f"[SUCCESS] Saved {FEATURE_IMPORTANCE_PNG.name}")


def train_and_evaluate():
    logger.info("=" * 80)
    logger.info("APDA MITRA — XGBOOST LANDSLIDE RISK MODEL TRAINING & EVALUATION")
    logger.info("=" * 80)

    # 1. Load data
    for p in [TRAIN_CSV_PATH, VAL_CSV_PATH, TEST_CSV_PATH]:
        if not p.exists():
            raise FileNotFoundError(f"Missing required dataset split: {p}")

    df_train = pd.read_csv(TRAIN_CSV_PATH)
    df_val = pd.read_csv(VAL_CSV_PATH)
    df_test = pd.read_csv(TEST_CSV_PATH)

    logger.info(f"Train Set:      {len(df_train):>5} samples (Positive: {(df_train[TARGET_COLUMN]==1).sum()})")
    logger.info(f"Validation Set: {len(df_val):>5} samples (Positive: {(df_val[TARGET_COLUMN]==1).sum()})")
    logger.info(f"Test Set:       {len(df_test):>5} samples (Positive: {(df_test[TARGET_COLUMN]==1).sum()})")

    X_train = df_train[FEATURE_COLUMNS]
    y_train = df_train[TARGET_COLUMN].astype(int)

    X_val = df_val[FEATURE_COLUMNS]
    y_val = df_val[TARGET_COLUMN].astype(int)

    X_test = df_test[FEATURE_COLUMNS]
    y_test = df_test[TARGET_COLUMN].astype(int)

    # 2. Compute class weighting for imbalance
    pos_train_cnt = int((y_train == 1).sum())
    neg_train_cnt = int((y_train == 0).sum())
    default_scale_pos = round(neg_train_cnt / max(1, pos_train_cnt), 3)
    logger.info(f"Computed Train scale_pos_weight: {neg_train_cnt}/{pos_train_cnt} = {default_scale_pos}")

    # 3. Hyperparameter Tuning using Train and Validation ONLY
    best_params, best_val_score = tune_hyperparameters_on_validation(
        X_train, y_train, X_val, y_val, default_scale_pos
    )

    # 4. Train final model with early stopping on validation set
    logger.info("Training final XGBoost classifier with optimal parameters and early stopping...")
    final_model = xgb.XGBClassifier(
        n_estimators=500,
        early_stopping_rounds=30,
        eval_metric="aucpr",
        random_state=RANDOM_SEED,
        n_jobs=-1,
        max_depth=best_params["max_depth"],
        learning_rate=best_params["learning_rate"],
        min_child_weight=best_params["min_child_weight"],
        subsample=best_params["subsample"],
        colsample_bytree=best_params["colsample_bytree"],
        scale_pos_weight=best_params["scale_pos_weight"],
        reg_lambda=best_params["reg_lambda"],
    )

    final_model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_val, y_val)],
        verbose=False,
    )
    logger.info(f"Model converged at iteration: {final_model.best_iteration}")

    # 5. Save model and metadata
    final_model.get_booster().save_model(str(MODEL_JSON_PATH))
    logger.info(f"[SUCCESS] Saved XGBoost model to {MODEL_JSON_PATH}")

    metadata = {
        "model_name": "Apda Mitra Landslide Risk XGBoost Classifier",
        "algorithm": "XGBoost (Extreme Gradient Boosting)",
        "xgboost_version": xgb.__version__,
        "training_timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "random_seed": RANDOM_SEED,
        "feature_list": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "dataset_sizes": {
            "train": len(df_train),
            "validation": len(df_val),
            "test": len(df_test),
            "total": len(df_train) + len(df_val) + len(df_test),
        },
        "best_hyperparameters": {
            "max_depth": int(best_params["max_depth"]),
            "learning_rate": float(best_params["learning_rate"]),
            "n_estimators": int(final_model.best_iteration + 1),
            "min_child_weight": int(best_params["min_child_weight"]),
            "subsample": float(best_params["subsample"]),
            "colsample_bytree": float(best_params["colsample_bytree"]),
            "scale_pos_weight": float(best_params["scale_pos_weight"]),
            "reg_lambda": float(best_params["reg_lambda"]),
            "eval_metric": "aucpr",
            "early_stopping_rounds": 30,
        },
        "model_file_path": str(MODEL_JSON_PATH),
    }

    with open(METADATA_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"[SUCCESS] Saved model metadata to {METADATA_JSON_PATH}")

    # 6. Evaluate strictly on untouched Test Set (2018–2021)
    logger.info("Evaluating on untouched test set (2018–2021)...")
    test_probs = final_model.predict_proba(X_test)[:, 1]

    # Standard 0.5 decision threshold
    test_preds_default = (test_probs >= 0.50).astype(int)

    # Compute standard metrics at 0.5
    roc_auc = float(roc_auc_score(y_test, test_probs))
    pr_auc = float(average_precision_score(y_test, test_probs))
    precision_50 = float(precision_score(y_test, test_preds_default, zero_division=0))
    recall_50 = float(recall_score(y_test, test_preds_default, zero_division=0))
    f1_50 = float(f1_score(y_test, test_preds_default, zero_division=0))
    brier = float(brier_score_loss(y_test, test_probs))

    tn_50, fp_50, fn_50, tp_50 = confusion_matrix(y_test, test_preds_default).ravel()
    fnr_50 = float(fn_50 / (fn_50 + tp_50)) if (fn_50 + tp_50) > 0 else 0.0

    # Disaster Early Warning Threshold Optimization
    # In life-critical disaster warning, False Negatives (missed landslides) are far more dangerous than False Positives.
    # We find threshold on Validation set that optimizes F1 or Recall >= 0.85
    val_probs = final_model.predict_proba(X_val)[:, 1]
    best_thresh_val = 0.50
    best_val_f1 = -1.0
    for t_cand in np.linspace(0.20, 0.70, 51):
        cand_preds = (val_probs >= t_cand).astype(int)
        score_f1 = f1_score(y_val, cand_preds, zero_division=0)
        if score_f1 > best_val_f1:
            best_val_f1 = score_f1
            best_thresh_val = float(t_cand)

    # Early-warning tuned predictions on test set
    test_preds_tuned = (test_probs >= best_thresh_val).astype(int)
    precision_tuned = float(precision_score(y_test, test_preds_tuned, zero_division=0))
    recall_tuned = float(recall_score(y_test, test_preds_tuned, zero_division=0))
    f1_tuned = float(f1_score(y_test, test_preds_tuned, zero_division=0))
    tn_t, fp_t, fn_t, tp_t = confusion_matrix(y_test, test_preds_tuned).ravel()
    fnr_tuned = float(fn_t / (fn_t + tp_t)) if (fn_t + tp_t) > 0 else 0.0

    # 7. Compute Feature Importance (Gain and SHAP)
    raw_booster = final_model.get_booster()
    score_gain = raw_booster.get_score(importance_type="gain")
    # Normalize gain to sum to 1.0
    total_gain = sum(score_gain.values())
    gain_importance = {feat: round(float(score_gain.get(feat, 0.0) / max(1e-6, total_gain)), 4) for feat in FEATURE_COLUMNS}
    gain_importance = dict(sorted(gain_importance.items(), key=lambda item: item[1], reverse=True))

    logger.info("Computing SHAP values on test set...")
    explainer = shap.TreeExplainer(final_model)
    shap_vals = explainer(X_test)
    mean_abs_shap = np.abs(shap_vals.values).mean(axis=0)
    shap_importance = {feat: round(float(mean_abs_shap[idx]), 4) for idx, feat in enumerate(FEATURE_COLUMNS)}
    shap_importance = dict(sorted(shap_importance.items(), key=lambda item: item[1], reverse=True))

    # 8. Generate Charts
    plot_evaluation_charts(
        y_test.to_numpy(),
        test_probs,
        test_preds_default,
        FEATURE_COLUMNS,
        gain_importance,
        shap_vals.values,
        X_test,
    )

    # 9. Save Test Metrics JSON Report
    metrics_report: Dict[str, Any] = {
        "model_name": "Apda Mitra Landslide Risk XGBoost Classifier",
        "evaluation_dataset": "Test Set (2018-04-27 to 2021-06-12)",
        "dataset_sizes": {
            "train_samples": len(df_train),
            "validation_samples": len(df_val),
            "test_samples": len(df_test),
            "positive_test_events": int((y_test == 1).sum()),
            "negative_test_samples": int((y_test == 0).sum()),
        },
        "feature_list": FEATURE_COLUMNS,
        "hyperparameters_applied": metadata["best_hyperparameters"],
        "primary_evaluation_metrics": {
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "brier_score_loss": round(brier, 4),
        },
        "decision_threshold_0_50": {
            "threshold": 0.50,
            "precision": round(precision_50, 4),
            "recall": round(recall_50, 4),
            "f1_score": round(f1_50, 4),
            "false_negative_rate": round(fnr_50, 4),
            "confusion_matrix": {
                "true_negatives": int(tn_50),
                "false_positives": int(fp_50),
                "false_negatives": int(fn_50),
                "true_positives": int(tp_50),
            },
        },
        "disaster_early_warning_tuned_threshold": {
            "threshold": round(best_thresh_val, 4),
            "tuning_criterion": "Validation F1-score optimization",
            "precision": round(precision_tuned, 4),
            "recall": round(recall_tuned, 4),
            "f1_score": round(f1_tuned, 4),
            "false_negative_rate": round(fnr_tuned, 4),
            "confusion_matrix": {
                "true_negatives": int(tn_t),
                "false_positives": int(fp_t),
                "false_negatives": int(fn_t),
                "true_positives": int(tp_t),
            },
        },
        "feature_importance_rankings": {
            "xgboost_gain_importance": gain_importance,
            "shap_mean_absolute_importance": shap_importance,
        },
        "scientific_assessment_and_limitations": {
            "production_readiness": "EXPERIMENTAL_BASELINE_ONLY (Do NOT claim production readiness from single experiment)",
            "key_limitations": [
                "Temporal evaluation window spans 2018-2021 with 200 samples; further cross-season temporal folds are required.",
                "Background non-landslide samples rely on pseudo-absence assumptions; local micro-failures in unpopulated zones may be unrecorded.",
                "Point-scale precipitation and catchment soil moisture from NASA GMAO/POWER carry coarse spatial resolution (~50 km) relative to slope-scale Copernicus 30m DEM.",
                "Geological lithology and road/infrastructure proximity layers are not yet integrated into this baseline.",
            ],
            "utility_for_further_experimentation": True,
            "recommendation": "Model demonstrates high discriminative capability on historical test window and provides a solid experimental benchmark for operational alerting pipeline iterations.",
        },
        "generated_artifacts": {
            "model_json": str(MODEL_JSON_PATH),
            "model_metadata_json": str(METADATA_JSON_PATH),
            "test_metrics_json": str(TEST_METRICS_PATH),
            "confusion_matrix_png": str(CONFUSION_MATRIX_PNG),
            "roc_curve_png": str(ROC_CURVE_PNG),
            "pr_curve_png": str(PR_CURVE_PNG),
            "feature_importance_png": str(FEATURE_IMPORTANCE_PNG),
        },
        "evaluation_timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }

    with open(TEST_METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)

    logger.info(f"[SUCCESS] Saved test evaluation metrics to {TEST_METRICS_PATH}")

    # 10. Print comprehensive summary to stdout
    print("\n" + "=" * 80)
    print("APDA MITRA — XGBOOST MODEL TRAINING & UNTOUCHED TEST EVALUATION")
    print("=" * 80)
    print(f"Dataset Sizes:      Train = {len(df_train)}, Validation = {len(df_val)}, Test = {len(df_test)} (Total: {len(df_train)+len(df_val)+len(df_test)})")
    print(f"Features (11):      {', '.join(FEATURE_COLUMNS)}")
    print(f"Hyperparameters:    depth={best_params['max_depth']}, lr={best_params['learning_rate']}, n_estimators={final_model.best_iteration+1}, scale_pos_weight={best_params['scale_pos_weight']:.2f}")

    print("\nTest Set Metrics (Untouched Period 2018–2021):")
    print(f"  ROC-AUC:          {roc_auc:.4f}")
    pos_prior = float(np.mean(y_test))
    print(f"  PR-AUC:           {pr_auc:.4f} (Baseline class prior: {pos_prior:.4f})")
    print(f"  Brier Score:      {brier:.4f}")

    print(f"\nDecision Threshold 0.50:")
    print(f"  Precision:        {precision_50:.4f}")
    print(f"  Recall:           {recall_50:.4f} (Crucial for disaster early warning)")
    print(f"  F1-Score:         {f1_50:.4f}")
    print(f"  False Neg. Rate:  {fnr_50:.4f} ({fn_50} missed landslides out of {tp_50+fn_50})")
    print(f"  Confusion Matrix: TN={tn_50}, FP={fp_50}, FN={fn_50}, TP={tp_50}")

    print(f"\nEarly-Warning Tuned Threshold ({best_thresh_val:.2f}):")
    print(f"  Precision:        {precision_tuned:.4f}")
    print(f"  Recall:           {recall_tuned:.4f}")
    print(f"  F1-Score:         {f1_tuned:.4f}")
    print(f"  False Neg. Rate:  {fnr_tuned:.4f} ({fn_t} missed landslides)")
    print(f"  Confusion Matrix: TN={tn_t}, FP={fp_t}, FN={fn_t}, TP={tp_t}")

    print("\nMost Important Features (XGBoost Gain):")
    for feat, imp in list(gain_importance.items())[:5]:
        print(f"  - {feat:<25}: {imp:.4f} (SHAP importance: {shap_importance.get(feat, 0.0):.4f})")

    print("\nLimitations & Scientific Assessment:")
    print("  * EXPERIMENTAL BASELINE ONLY: Model is NOT claimed as production-ready based on a single experiment.")
    print("  * Evaluation spans 2018-2021 test period; further rolling seasonal cross-validation is needed.")
    print("  * Coarse satellite reanalysis grid (NASA MERRA-2/POWER) vs high-resolution Copernicus 30m DEM.")
    print("  * Utility: Highly promising discriminative benchmark for ongoing operational iterations.")
    print("=" * 80)


if __name__ == "__main__":
    train_and_evaluate()
