"""
APDA MITRA — Train XGBoost Model on Uttarakhand + Himachal Pradesh Dataset V1
==============================================================================
Trains and evaluates the canonical XGBoost Landslide Risk Model on the
Western Himalayan training table.

Workflow:
1. Load dataset: backend/ai/datasets/processed/apda_mitra_uk_hp_training.csv
2. Features:
   - rain_24h (mm)
   - rain_7d (mm)
   - soil_moisture (m3/m3)
   - elevation (m)
   - slope (deg)
   - latitude (optional/spatial context)
   - longitude (optional/spatial context)
3. Target: landslide (1 = occurrence, 0 = stable)
4. Stratified Split: 70% Train, 15% Validation, 15% Test
5. Standard scaling fitted on Train
6. XGBoost Classifier training with early stopping on validation PR-AUC
7. Rigorous Evaluation on Test Set:
   - Accuracy
   - Precision
   - Recall
   - F1-Score
   - ROC-AUC
   - PR-AUC (Average Precision)
   - Confusion Matrix (TP, FP, TN, FN)
8. Save artifacts:
   - models/uk_hp/apda_mitra_xgboost.pkl
   - models/uk_hp/scaler.joblib
   - models/uk_hp/features.json
   - models/uk_hp/model_metadata.json
"""

import json
import pickle
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

# Set paths
BACKEND_ROOT = Path(__file__).resolve().parents[2]
AI_DIR = BACKEND_ROOT / "ai"
DATASETS_DIR = AI_DIR / "datasets"
PROCESSED_DIR = DATASETS_DIR / "processed"
MODELS_DIR = DATASETS_DIR / "models"
UK_HP_MODEL_DIR = MODELS_DIR / "uk_hp"
LATEST_MODEL_DIR = MODELS_DIR / "latest"

UK_HP_MODEL_DIR.mkdir(parents=True, exist_ok=True)
LATEST_MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Feature definitions
FEATURE_COLS = [
    "rain_24h",
    "rain_7d",
    "soil_moisture",
    "elevation",
    "slope",
]

TARGET_COL = "landslide"


def train_and_evaluate():
    print("=" * 70)
    print("APDA MITRA — TRAINING XGBOOST (UTTARAKHAND + HIMACHAL PRADESH V1)")
    print("=" * 70)

    csv_path = PROCESSED_DIR / "apda_mitra_uk_hp_training.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Training dataset not found at {csv_path}. Please run dataset builder first.")

    df = pd.read_csv(csv_path)
    print(f"[*] Loaded dataset with {len(df)} samples.")
    print(f"    - Landslide positives (1): {(df[TARGET_COL] == 1).sum()}")
    print(f"    - Stable controls (0):    {(df[TARGET_COL] == 0).sum()}")

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    # Stratified split: 70% Train, 30% Temp (15% Val, 15% Test)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    print(f"\n[*] Data Splits:")
    print(f"    - Train set:      {len(X_train)} samples ({y_train.sum()} positives)")
    print(f"    - Validation set: {len(X_val)} samples ({y_val.sum()} positives)")
    print(f"    - Test set:       {len(X_test)} samples ({y_test.sum()} positives)")

    # Standard Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Class balance weight
    scale_pos = (y_train == 0).sum() / max(1, (y_train == 1).sum())

    # Configure XGBoost
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos,
        eval_metric="aucpr",
        random_state=42,
    )

    print("\n[*] Training XGBoost Classifier...")
    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_val_scaled, y_val)],
        verbose=False,
    )
    print("[+] Model training completed.")

    # Predictions & Probabilities on Test set
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    y_pred = (y_pred_proba >= 0.50).astype(int)

    # Metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_pred_proba))
    pr_auc = float(average_precision_score(y_test, y_pred_proba))
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\n" + "=" * 70)
    print("TEST SET EVALUATION METRICS")
    print("=" * 70)
    print(f"Accuracy:        {acc:.4f} ({acc*100:.1f}%)")
    print(f"Precision:       {prec:.4f}")
    print(f"Recall:          {rec:.4f}")
    print(f"F1 Score:        {f1:.4f}")
    print(f"ROC-AUC:         {roc_auc:.4f}")
    print(f"PR-AUC (Avg P):  {pr_auc:.4f}")

    print("\nConfusion Matrix:")
    print(f"                 Predicted Stable(0)  Predicted Landslide(1)")
    print(f"Actual Stable(0)         {cm[0][0]:<19}  {cm[0][1]}")
    print(f"Actual Slide(1)          {cm[1][0]:<19}  {cm[1][1]}")

    print("\nDetailed Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Stable (0)", "Landslide (1)"]))

    # Feature Importance
    importances = model.feature_importances_
    importance_dict = {
        feat: float(imp)
        for feat, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: x[1], reverse=True)
    }
    print("Feature Importances (Gain/Gini):")
    for feat, imp in importance_dict.items():
        bar = "#" * int(imp * 40)
        print(f"  {feat:<18}: {imp:.4f} {bar}")

    # -------------------------------------------------------------------------
    # Save Model Artifacts
    # -------------------------------------------------------------------------
    print("\n[*] Saving model artifacts...")

    # 1. Pickle & Joblib
    pkl_path = UK_HP_MODEL_DIR / "apda_mitra_xgboost.pkl"
    with open(pkl_path, "wb") as f:
        pickle.dump(model, f)

    joblib_path = UK_HP_MODEL_DIR / "apda_mitra_xgboost.joblib"
    joblib.dump(model, joblib_path)

    scaler_path = UK_HP_MODEL_DIR / "scaler.joblib"
    joblib.dump(scaler, scaler_path)

    # 2. Features JSON
    features_meta = {
        "features": FEATURE_COLS,
        "feature_count": len(FEATURE_COLS),
        "target": TARGET_COL,
        "feature_importances": importance_dict,
        "scaling": "StandardScaler",
    }
    features_path = UK_HP_MODEL_DIR / "features.json"
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump(features_meta, f, indent=2)

    # 3. Model Metadata JSON
    from datetime import timezone
    metadata = {
        "model_name": "Apda Mitra XGBoost Landslide Classifier (Uttarakhand + Himachal Pradesh V1)",
        "algorithm": "XGBoost (Extreme Gradient Boosting)",
        "version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "training_region": "Uttarakhand + Himachal Pradesh (Western Himalayas)",
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test),
        "features": FEATURE_COLS,
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
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
    metadata_path = UK_HP_MODEL_DIR / "model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Also copy / write to latest directory
    with open(LATEST_MODEL_DIR / "apda_mitra_xgboost.pkl", "wb") as f:
        pickle.dump(model, f)
    joblib.dump(model, LATEST_MODEL_DIR / "model.joblib")
    joblib.dump(scaler, LATEST_MODEL_DIR / "scaler.joblib")
    with open(LATEST_MODEL_DIR / "features.json", "w", encoding="utf-8") as f:
        json.dump(features_meta, f, indent=2)
    with open(LATEST_MODEL_DIR / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[OK] Saved model pickle:   {pkl_path}")
    print(f"[OK] Saved model joblib:   {joblib_path}")
    print(f"[OK] Saved scaler:         {scaler_path}")
    print(f"[OK] Saved feature specs:  {features_path}")
    print(f"[OK] Saved metadata:       {metadata_path}")
    print(f"[OK] Updated latest model: {LATEST_MODEL_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    train_and_evaluate()
