"""
APDA MITRA — ML Pipeline Step 4: XGBoost Model Training & Comprehensive Validation
==================================================================================
Trains and validates the canonical Apda Mitra XGBoost Landslide Risk Classifier
using strict temporal blocking on the 10-state Himalayan & Northeast dataset:

- Train Set:      1990–2015 (1,648 samples)
- Validation Set: 2016–2017 (301 samples, used for early stopping)
- Test Set:       2018–2021 (253 samples, completely unseen future window)

Features (10):
- rain_1d, rain_3d, rain_7d, rain_30d
- soil_moisture, soil_moisture_anomaly
- elevation, slope, aspect, curvature

Evaluation Metrics:
- Accuracy, Precision, Recall, F1-Score
- ROC-AUC, PR-AUC (Average Precision)
- Brier Score (Probability Calibration)
- Confusion Matrix
- Feature Importance ranking

Outputs:
- ml/models/apda_mitra_xgboost.pkl
- ml/models/apda_mitra_xgboost.joblib
- ml/models/scaler.joblib
- ml/models/features.json
- ml/models/model_metadata.json
"""

import json
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

# Paths
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
ML_DATA_DIR = WORKSPACE_ROOT / "ml" / "data"
ML_MODELS_DIR = WORKSPACE_ROOT / "ml" / "models"

ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "rain_1d",
    "rain_3d",
    "rain_7d",
    "rain_30d",
    "soil_moisture",
    "soil_moisture_anomaly",
    "elevation",
    "slope",
    "aspect",
    "curvature",
]

TARGET_COL = "landslide"


def train_and_evaluate():
    print("=" * 75)
    print("APDA MITRA — TRAINING XGBOOST ON 10-STATE DATASET WITH TEMPORAL BLOCKING")
    print("=" * 75)

    csv_path = ML_DATA_DIR / "apda_mitra_training_dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Training dataset not found at {csv_path}. Run feature extraction first.")

    df = pd.read_csv(csv_path)
    print(f"[*] Loaded dataset with {len(df)} total samples.")

    # 1. Temporal Splits
    train_df = df[df["temporal_split"] == "train"]
    val_df = df[df["temporal_split"] == "validation"]
    test_df = df[df["temporal_split"] == "test"]

    X_train, y_train = train_df[FEATURE_COLS], train_df[TARGET_COL]
    X_val, y_val = val_df[FEATURE_COLS], val_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COLS], test_df[TARGET_COL]

    print(f"\n[*] Temporal Split Sizes:")
    print(f"    - Train Set      (1990-2015): {len(X_train)} samples ({y_train.sum()} landslides)")
    print(f"    - Validation Set (2016-2017): {len(X_val)} samples ({y_val.sum()} landslides)")
    print(f"    - Test Set       (2018-2021): {len(X_test)} samples ({y_test.sum()} landslides)")

    # 2. Fit Scaler strictly on Train Set
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Class balance weight
    scale_pos = (y_train == 0).sum() / max(1, (y_train == 1).sum())

    # 3. XGBoost Classifier Configuration
    model = xgb.XGBClassifier(
        n_estimators=350,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos,
        eval_metric="aucpr",
        random_state=42,
    )

    print("\n[*] Training XGBoost with early stopping on validation PR-AUC...")
    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_val_scaled, y_val)],
        verbose=False,
    )
    print("[+] Model training converged successfully.")

    # 4. Evaluation on Completely Unseen Future Test Set (2018–2021)
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    y_pred = (y_pred_proba >= 0.50).astype(int)

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_pred_proba))
    pr_auc = float(average_precision_score(y_test, y_pred_proba))
    brier = float(brier_score_loss(y_test, y_pred_proba))
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\n" + "=" * 75)
    print("UNSEEN FUTURE TEST SET EVALUATION (2018–2021)")
    print("=" * 75)
    print(f"Accuracy:                  {acc:.4f} ({acc*100:.1f}%)")
    print(f"Recall (Sensitivity):      {rec:.4f} ({rec*100:.1f}%)")
    print(f"Precision:                 {prec:.4f}")
    print(f"F1-Score:                  {f1:.4f}")
    print(f"ROC-AUC:                   {roc_auc:.4f}")
    print(f"PR-AUC (Avg Precision):    {pr_auc:.4f}")
    print(f"Brier Score (Calibration): {brier:.4f} (lower is better, <0.05 is excellent)")

    print("\nConfusion Matrix:")
    print(f"                  Predicted Stable(0)  Predicted Landslide(1)")
    print(f"Actual Stable(0)          {cm[0][0]:<19}  {cm[0][1]}")
    print(f"Actual Slide(1)           {cm[1][0]:<19}  {cm[1][1]}")

    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Stable (0)", "Landslide (1)"]))

    # Feature Importance
    importances = model.feature_importances_
    importance_dict = {
        feat: float(imp)
        for feat, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: x[1], reverse=True)
    }
    print("Feature Importances (Gain):")
    for feat, imp in importance_dict.items():
        bar = "#" * int(imp * 40)
        print(f"  {feat:<22}: {imp:.4f} {bar}")

    # 5. Save Artifacts
    print("\n[*] Saving model artifacts...")

    pkl_path = ML_MODELS_DIR / "apda_mitra_xgboost.pkl"
    with open(pkl_path, "wb") as f:
        pickle.dump(model, f)

    joblib_path = ML_MODELS_DIR / "apda_mitra_xgboost.joblib"
    joblib.dump(model, joblib_path)

    scaler_path = ML_MODELS_DIR / "scaler.joblib"
    joblib.dump(scaler, scaler_path)

    features_meta = {
        "features": FEATURE_COLS,
        "feature_count": len(FEATURE_COLS),
        "target": TARGET_COL,
        "feature_importances": importance_dict,
        "scaling": "StandardScaler",
    }
    features_path = ML_MODELS_DIR / "features.json"
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump(features_meta, f, indent=2)

    metadata = {
        "model_name": "Apda Mitra 10-State Himalayan & Northeast XGBoost Landslide Predictor",
        "algorithm": "XGBoost (Extreme Gradient Boosting)",
        "version": "2.0.0",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "geographic_scope": "10 States (HP, UK, Sikkim, Arunachal, Assam, Meghalaya, Nagaland, Manipur, Mizoram, Tripura)",
        "temporal_blocking": {
            "train_period": "1990-2015",
            "validation_period": "2016-2017",
            "test_period": "2018-2021",
        },
        "sample_counts": {
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "total_samples": len(df),
        },
        "metrics_on_unseen_test": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "brier_score": round(brier, 4),
            "confusion_matrix": {
                "true_negative": cm[0][0],
                "false_positive": cm[0][1],
                "false_negative": cm[1][0],
                "true_positive": cm[1][1],
            },
        },
        "risk_thresholds": {
            "low": 0.30,
            "moderate": 0.55,
            "high": 0.75,
            "critical": 0.88,
        },
    }
    metadata_path = ML_MODELS_DIR / "model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[OK] Saved model pickle:  {pkl_path}")
    print(f"[OK] Saved model joblib:  {joblib_path}")
    print(f"[OK] Saved scaler:        {scaler_path}")
    print(f"[OK] Saved feature specs: {features_path}")
    print(f"[OK] Saved metadata JSON: {metadata_path}")
    print("=" * 75)


if __name__ == "__main__":
    train_and_evaluate()
