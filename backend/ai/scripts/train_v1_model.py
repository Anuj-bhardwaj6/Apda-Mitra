"""
Train Production Model on Apda Mitra Dataset v1
================================================
Trains XGBoost Classifier using the exact 4 pillars:
1. NASA COOLR (target: landslide)
2. NASA GPM IMERG (rainfall_1d, rainfall_3d, rainfall_7d, peak_intensity)
3. NASA/USDA SMAP (surface_moisture, rootzone_moisture, saturation_ratio)
4. Copernicus GLO-30 (elevation, slope, aspect, curvature, twi)
"""

import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    average_precision_score,
)
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

# Paths
BACKEND_ROOT = Path(__file__).resolve().parents[2]
AI_DIR = BACKEND_ROOT / "ai"
DATASETS_DIR = AI_DIR / "datasets"
PROCESSED_DIR = DATASETS_DIR / "processed"
MODELS_DIR = DATASETS_DIR / "models"
LATEST_MODEL_DIR = MODELS_DIR / "latest"
LATEST_MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    # Copernicus GLO-30
    "copernicus_elevation_m",
    "copernicus_slope_deg",
    "copernicus_aspect_deg",
    "copernicus_plan_curvature",
    "copernicus_profile_curvature",
    "copernicus_twi",
    # NASA GPM IMERG
    "gpm_imerg_rainfall_1d_mm",
    "gpm_imerg_rainfall_3d_mm",
    "gpm_imerg_rainfall_7d_mm",
    "gpm_imerg_peak_intensity_mm_h",
    # NASA/USDA SMAP
    "smap_surface_moisture_m3m3",
    "smap_rootzone_moisture_m3m3",
    "smap_soil_saturation_ratio",
]

TARGET_COL = "landslide"


def main():
    print("=" * 65)
    print("TRAINING APDA MITRA AI MODEL ON DATASET V1 (4 PILLARS)")
    print("=" * 65)

    dataset_path = PROCESSED_DIR / "apda_mitra_dataset_v1.parquet"
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    df = pd.read_parquet(dataset_path)
    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]
    test_df = df[df["split"] == "test"]

    X_train, y_train = train_df[FEATURE_COLS], train_df[TARGET_COL]
    X_val, y_val = val_df[FEATURE_COLS], val_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COLS], test_df[TARGET_COL]

    print(f"[*] Train set: {len(X_train)} | Val set: {len(X_val)} | Test set: {len(X_test)}")

    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # Train XGBoost Classifier
    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="aucpr",
        random_state=42,
    )

    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_val_scaled, y_val)],
        verbose=False,
    )

    # Evaluation on Test Set
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]

    roc_auc = roc_auc_score(y_test, y_prob)
    pr_auc = average_precision_score(y_test, y_prob)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)

    print("\n" + "=" * 65)
    print("TEST SET EVALUATION METRICS:")
    print("=" * 65)
    print(f"ROC-AUC:            {roc_auc:.4f}")
    print(f"PR-AUC (Avg Prec):  {pr_auc:.4f}")
    print(f"Accuracy:           {acc:.4f}")
    print(f"F1-Score:           {f1:.4f}")
    print(f"Precision:          {prec:.4f}")
    print(f"Recall:             {rec:.4f}")
    print("=" * 65)

    # Feature Importances
    importances = pd.Series(model.feature_importances_, index=FEATURE_COLS).sort_values(ascending=False)
    print("\nTOP FEATURE IMPORTANCES:")
    for feat, imp in importances.items():
        print(f"  {feat:<35} {imp:.4f}")

    # Save artifacts
    model_path = LATEST_MODEL_DIR / "model.joblib"
    scaler_path = LATEST_MODEL_DIR / "scaler.joblib"
    features_path = LATEST_MODEL_DIR / "feature_list.json"
    metrics_path = LATEST_MODEL_DIR / "metrics.json"
    manifest_path = LATEST_MODEL_DIR / "model_manifest.json"
    fi_path = LATEST_MODEL_DIR / "feature_importance.json"
    config_path = LATEST_MODEL_DIR / "training_config.json"

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    # Compute sha256 checksum of saved model binary
    import hashlib
    with open(model_path, "rb") as f:
        model_sha256 = hashlib.sha256(f.read()).hexdigest()

    with open(features_path, "w") as f:
        json.dump(FEATURE_COLS, f, indent=2)

    fi_dict = {k: round(float(v), 4) for k, v in importances.items()}
    with open(fi_path, "w") as f:
        json.dump(fi_dict, f, indent=2)

    metrics_dict = {
        "dataset": "Apda Mitra Dataset v1",
        "roc_auc": round(float(roc_auc), 4),
        "pr_auc": round(float(pr_auc), 4),
        "accuracy": round(float(acc), 4),
        "f1": round(float(f1), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "feature_importances": fi_dict,
    }
    with open(metrics_path, "w") as f:
        json.dump(metrics_dict, f, indent=2)

    config_dict = {
        "model_type": "XGBoostClassifier",
        "version": "v1.0.0-apdamitra-4pillars",
        "four_pillars": {
            "events": "NASA COOLR (Cooperative Open Online Landslide Repository)",
            "precipitation": "NASA GPM IMERG (Integrated Multi-satellitE Retrievals for GPM)",
            "soil_moisture": "NASA/USDA SMAP (Soil Moisture Active Passive)",
            "elevation_and_slope": "Copernicus GLO-30 (Global 30m Digital Elevation Model)",
        },
        "n_features": len(FEATURE_COLS),
        "parameters": {
            "n_estimators": 300,
            "max_depth": 5,
            "learning_rate": 0.03,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "eval_metric": "aucpr",
        },
    }
    with open(config_path, "w") as f:
        json.dump(config_dict, f, indent=2)

    manifest_dict = {
        "name": "Apda Mitra AI Landslide Early Warning Model",
        "version": "v1.0.0-apdamitra-4pillars",
        "dataset": "Apda Mitra Dataset v1",
        "created_at": pd.Timestamp.now().isoformat(),
        "sha256": model_sha256,
        "features_count": len(FEATURE_COLS),
        "four_pillars": config_dict["four_pillars"],
        "metrics": metrics_dict,
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest_dict, f, indent=2)

    print(f"\n[OK] Model saved:     {model_path}")
    print(f"[OK] Scaler saved:    {scaler_path}")
    print(f"[OK] Metrics saved:   {metrics_path}")
    print(f"[OK] Manifest saved:  {manifest_path}")
    print(f"[OK] Config saved:    {config_path}")
    print(f"[OK] SHA-256:         {model_sha256}")
    print("[SUCCESS] Apda Mitra v1 AI model training completed!")


if __name__ == "__main__":
    main()
