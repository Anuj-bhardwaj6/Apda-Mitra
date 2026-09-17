"""
Model Training — Evaluation Pipeline
======================================
Computes a full suite of classification metrics and plots for the
trained XGBoost landslide prediction model.

Metrics:
  - ROC AUC, PR AUC
  - Precision, Recall, F1-Score, Accuracy
  - Confusion Matrix
  - ROC Curve, Precision-Recall Curve, Calibration Curve

All plots are saved to datasets/artifacts/ and logged to MLflow.
Final metrics exported to datasets/models/latest/metrics.json.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

import sys
sys.path.insert(0, str(Path(__file__).parents[3]))

from ai.config import ARTIFACTS_DIR, LATEST_MODEL_DIR, METRICS_FILENAME
from ai.logger import PipelineLogger

log = PipelineLogger("training.evaluate")


def _save_plot(fig, filename: str) -> Path:
    """Saves a matplotlib figure to the artifacts directory."""
    path = ARTIFACTS_DIR / filename
    fig.savefig(str(path), dpi=150, bbox_inches="tight")
    return path


def plot_roc_curve(y_true: np.ndarray, y_prob: np.ndarray, split_name: str) -> Path:
    """Generates and saves a ROC curve plot."""
    try:
        import matplotlib.pyplot as plt
        from sklearn.metrics import roc_curve

        fpr, tpr, _ = roc_curve(y_true, y_prob)
        auc_val = roc_auc_score(y_true, y_prob)

        fig, ax = plt.subplots(figsize=(7, 5))
        ax.plot(fpr, tpr, color="#0F4C81", lw=2, label=f"AUC = {auc_val:.4f}")
        ax.plot([0, 1], [0, 1], color="gray", lw=1, linestyle="--", label="Random")
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title(f"ROC Curve — {split_name.upper()} Set")
        ax.legend(loc="lower right")
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        path = _save_plot(fig, f"roc_curve_{split_name}.png")
        plt.close(fig)
        return path
    except Exception as exc:
        log.warning("ROC curve plot failed", error=str(exc))
        return None


def plot_pr_curve(y_true: np.ndarray, y_prob: np.ndarray, split_name: str) -> Path:
    """Generates and saves a Precision-Recall curve plot."""
    try:
        import matplotlib.pyplot as plt
        from sklearn.metrics import precision_recall_curve

        precision, recall, _ = precision_recall_curve(y_true, y_prob)
        ap = average_precision_score(y_true, y_prob)

        fig, ax = plt.subplots(figsize=(7, 5))
        ax.plot(recall, precision, color="#D32F2F", lw=2, label=f"AP = {ap:.4f}")
        baseline = y_true.mean()
        ax.axhline(y=baseline, color="gray", lw=1, linestyle="--", label=f"Baseline = {baseline:.3f}")
        ax.set_xlabel("Recall")
        ax.set_ylabel("Precision")
        ax.set_title(f"Precision-Recall Curve — {split_name.upper()} Set")
        ax.legend(loc="upper right")
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        path = _save_plot(fig, f"pr_curve_{split_name}.png")
        plt.close(fig)
        return path
    except Exception as exc:
        log.warning("PR curve plot failed", error=str(exc))
        return None


def plot_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, split_name: str) -> Path:
    """Generates and saves a confusion matrix heatmap."""
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns

        cm = confusion_matrix(y_true, y_pred)
        fig, ax = plt.subplots(figsize=(5, 4))
        sns.heatmap(
            cm, annot=True, fmt="d", cmap="Blues", ax=ax,
            xticklabels=["No Landslide", "Landslide"],
            yticklabels=["No Landslide", "Landslide"],
        )
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_title(f"Confusion Matrix — {split_name.upper()} Set")
        plt.tight_layout()
        path = _save_plot(fig, f"confusion_matrix_{split_name}.png")
        plt.close(fig)
        return path
    except Exception as exc:
        log.warning("Confusion matrix plot failed", error=str(exc))
        return None


def plot_calibration_curve(y_true: np.ndarray, y_prob: np.ndarray, split_name: str) -> Path:
    """Generates and saves a calibration curve."""
    try:
        import matplotlib.pyplot as plt
        from sklearn.calibration import calibration_curve

        fraction_of_positives, mean_predicted_value = calibration_curve(
            y_true, y_prob, n_bins=10
        )

        fig, ax = plt.subplots(figsize=(7, 5))
        ax.plot(mean_predicted_value, fraction_of_positives, "s-", color="#0F4C81", label="XGBoost")
        ax.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
        ax.set_xlabel("Mean predicted probability")
        ax.set_ylabel("Fraction of positives")
        ax.set_title(f"Calibration Curve — {split_name.upper()} Set")
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.tight_layout()
        path = _save_plot(fig, f"calibration_curve_{split_name}.png")
        plt.close(fig)
        return path
    except Exception as exc:
        log.warning("Calibration curve plot failed", error=str(exc))
        return None


def evaluate_model(
    model,
    X: pd.DataFrame,
    y: pd.Series,
    split_name: str = "test",
    threshold: float = 0.5,
) -> dict[str, Any]:
    """
    Evaluates a trained model and returns a comprehensive metrics dict.

    Args:
        model: Fitted XGBClassifier
        X: Feature matrix
        y: True labels
        split_name: Name of the data split (for plot filenames)
        threshold: Classification threshold

    Returns:
        Dict of all metrics
    """
    log.info("Evaluating model", split=split_name, n_samples=len(X))

    y_prob = model.predict_proba(X)[:, 1]
    y_pred = (y_prob >= threshold).astype(int)
    y_true = y.values

    # Core metrics
    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    precision = float(precision_score(y_true, y_pred, zero_division=0))
    recall = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    accuracy = float(accuracy_score(y_true, y_pred))
    cm = confusion_matrix(y_true, y_pred)

    metrics: dict[str, Any] = {
        "roc_auc": round(roc_auc, 6),
        "pr_auc": round(pr_auc, 6),
        "precision": round(precision, 6),
        "recall": round(recall, 6),
        "f1_score": round(f1, 6),
        "accuracy": round(accuracy, 6),
        "confusion_matrix": cm.tolist(),
        "threshold": threshold,
        "n_samples": len(X),
        "n_positive": int(y_true.sum()),
        "n_negative": int((y_true == 0).sum()),
        "evaluated_at": datetime.utcnow().isoformat(),
        "split": split_name,
    }

    log.info("Metrics computed",
             roc_auc=round(roc_auc, 4), f1=round(f1, 4),
             precision=round(precision, 4), recall=round(recall, 4))

    # Generate and save plots
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    plot_roc_curve(y_true, y_prob, split_name)
    plot_pr_curve(y_true, y_prob, split_name)
    plot_confusion_matrix(y_true, y_pred, split_name)
    plot_calibration_curve(y_true, y_prob, split_name)

    return metrics


if __name__ == "__main__":
    """Standalone evaluation: loads latest model and test set."""
    from scripts.deployment.load_model import ModelLoader
    from scripts.etl.transform import transform

    log.info("Loading model and test data for standalone evaluation")
    loader = ModelLoader()
    model = loader.get_model()
    X, y = transform(fit_scaler=False)

    from sklearn.model_selection import train_test_split
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.15, stratify=y, random_state=42)
    _, X_test, _, y_test = train_test_split(X_test, y_test, test_size=0.5, stratify=y_test, random_state=42)

    metrics = evaluate_model(model, X_test, y_test, split_name="standalone_test")
    print(f"\n✅ Evaluation complete")
    for k, v in metrics.items():
        if isinstance(v, float):
            print(f"  {k}: {v:.4f}")
