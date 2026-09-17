"""
APDA MITRA — Multi-Configuration XGBoost Trainer & High-Recall Champion Selector (Steps 4 & 5)
=============================================================================================
Trains 4 distinct XGBoost configurations prioritizing disaster recall:
- Precision, Recall, F1, ROC-AUC, PR-AUC, Confusion Matrix
- Selects the champion model with highest Recall (minimizing dangerous False Negatives)
- Exports:
    - apda_mitra_xgboost.pkl
    - feature_scaler.pkl
    - feature_columns.json
    - model_metadata.json
"""

import hashlib
import json
import pickle
from pathlib import Path
from typing import Any, Dict, List

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
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

BACKEND_ROOT = Path(__file__).resolve().parents[2]
AI_DIR = BACKEND_ROOT / "ai"
DATASETS_DIR = AI_DIR / "datasets"
PROCESSED_DIR = DATASETS_DIR / "processed"
MODELS_DIR = DATASETS_DIR / "models"
PROD_MODEL_DIR = MODELS_DIR / "production"
LATEST_MODEL_DIR = MODELS_DIR / "latest"

for p in [PROD_MODEL_DIR, LATEST_MODEL_DIR]:
    p.mkdir(parents=True, exist_ok=True)

FEATURE_COLUMNS = [
    "rain_1h",
    "rain_6h",
    "rain_24h",
    "rain_3d",
    "rain_7d",
    "soil_moisture",
    "soil_moisture_anomaly",
    "elevation",
    "slope",
    "aspect",
]

TARGET_COL = "landslide"

CONFIGURATIONS = {
    "Config_1_Conservative": {
        "n_estimators": 250,
        "max_depth": 4,
        "learning_rate": 0.05,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "eval_metric": "aucpr",
        "random_state": 42,
    },
    "Config_2_DeepInteractions": {
        "n_estimators": 350,
        "max_depth": 7,
        "learning_rate": 0.02,
        "subsample": 0.80,
        "colsample_bytree": 0.80,
        "min_child_weight": 3,
        "eval_metric": "aucpr",
        "random_state": 42,
    },
    "Config_3_HighRecall_DisasterPriority": {
        "n_estimators": 300,
        "max_depth": 5,
        "learning_rate": 0.03,
        "scale_pos_weight": 1.4,  # Heavily penalize missed landslide false negatives
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "eval_metric": "aucpr",
        "random_state": 42,
    },
    "Config_4_TunedRegularized": {
        "n_estimators": 300,
        "max_depth": 5,
        "learning_rate": 0.03,
        "gamma": 0.2,
        "reg_alpha": 0.15,
        "reg_lambda": 1.5,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "eval_metric": "aucpr",
        "random_state": 42,
    },
}


def main():
    print("=" * 76)
    print("APDA MITRA AI: TRAINING 4 XGBOOST CONFIGURATIONS (HIGH-RECALL PRIORITY)")
    print("=" * 76)

    dataset_path = PROCESSED_DIR / "apda_mitra_roadmap_dataset.parquet"
    df = pd.read_parquet(dataset_path)

    train_df = df[df["split"] == "train"]
    val_df = df[df["split"] == "val"]
    test_df = df[df["split"] == "test"]

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df[TARGET_COL]
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df[TARGET_COL]
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df[TARGET_COL]

    print(f"[*] Train={len(X_train)} | Val={len(X_val)} | Test={len(X_test)}")
    print(f"[*] Features: {FEATURE_COLUMNS}")

    # Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    results = {}
    models = {}

    for name, params in CONFIGURATIONS.items():
        print(f"\n--- Training {name} ---")
        clf = xgb.XGBClassifier(**params)
        clf.fit(X_train_scaled, y_train, eval_set=[(X_val_scaled, y_val)], verbose=False)

        pred = clf.predict(X_test_scaled)
        prob = clf.predict_proba(X_test_scaled)[:, 1]

        cm = confusion_matrix(y_test, pred).tolist()
        tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]

        rec = float(recall_score(y_test, pred))
        prec = float(precision_score(y_test, pred))
        f1 = float(f1_score(y_test, pred))
        roc = float(roc_auc_score(y_test, prob))
        pr_auc = float(average_precision_score(y_test, prob))
        acc = float(accuracy_score(y_test, pred))

        results[name] = {
            "params": params,
            "metrics": {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "roc_auc": round(roc, 4),
                "pr_auc": round(pr_auc, 4),
                "accuracy": round(acc, 4),
            },
            "confusion_matrix": {
                "true_negative": tn,
                "false_positive": fp,
                "false_negative": fn,
                "true_positive": tp,
            },
        }
        models[name] = clf
        print(f"    Recall:           {rec:.4f} (False Negatives: {fn})")
        print(f"    Precision:        {prec:.4f} (False Positives: {fp})")
        print(f"    F1-Score:         {f1:.4f}")
        print(f"    ROC-AUC:          {roc:.4f}")
        print(f"    PR-AUC:           {pr_auc:.4f}")

    # Select champion model: Highest Recall first, then Highest F1
    champion_name = max(
        results.keys(),
        key=lambda k: (results[k]["metrics"]["recall"], results[k]["metrics"]["f1_score"]),
    )
    champion_model = models[champion_name]
    champ_metrics = results[champion_name]["metrics"]
    champ_cm = results[champion_name]["confusion_matrix"]

    print("\n" + "=" * 76)
    print(f"CHAMPION MODEL SELECTED: {champion_name}")
    print(f"  Recall (Safety Priority): {champ_metrics['recall']:.4f} (FN: {champ_cm['false_negative']})")
    print(f"  Precision:                {champ_metrics['precision']:.4f} (FP: {champ_cm['false_positive']})")
    print(f"  F1-Score:                 {champ_metrics['f1_score']:.4f}")
    print(f"  ROC-AUC:                  {champ_metrics['roc_auc']:.4f}")
    print("=" * 76)

    # Feature Importance
    importances = pd.Series(champion_model.feature_importances_, index=FEATURE_COLUMNS).sort_values(ascending=False)
    print("\nFEATURE IMPORTANCES:")
    for feat, imp in importances.items():
        print(f"  {feat:<25} {imp:.4f}")

    # -----------------------------------------------------------------------
    # Step 5: Save the trained model with user-requested filenames
    # -----------------------------------------------------------------------
    for target_dir in [PROD_MODEL_DIR, LATEST_MODEL_DIR]:
        # apda_mitra_xgboost.pkl
        model_pkl_path = target_dir / "apda_mitra_xgboost.pkl"
        with open(model_pkl_path, "wb") as f:
            pickle.dump(champion_model, f)

        # feature_scaler.pkl
        scaler_pkl_path = target_dir / "feature_scaler.pkl"
        with open(scaler_pkl_path, "wb") as f:
            pickle.dump(scaler, f)

        # joblib copies for backwards compatibility
        import joblib
        joblib.dump(champion_model, target_dir / "model.joblib")
        joblib.dump(scaler, target_dir / "scaler.joblib")

        # feature_columns.json
        cols_path = target_dir / "feature_columns.json"
        with open(cols_path, "w") as f:
            json.dump(FEATURE_COLUMNS, f, indent=2)

        # compute sha256
        with open(model_pkl_path, "rb") as f:
            sha256 = hashlib.sha256(f.read()).hexdigest()

        # model_metadata.json
        meta_payload = {
            "model_name": "Apda Mitra AI Landslide Prediction Engine",
            "model_version": "v1.1.0-roadmap-champion",
            "algorithm": "XGBoostClassifier",
            "champion_config": champion_name,
            "created_at": pd.Timestamp.now().isoformat(),
            "sha256": sha256,
            "features_count": len(FEATURE_COLUMNS),
            "features": FEATURE_COLUMNS,
            "feature_importances": {k: round(float(v), 4) for k, v in importances.items()},
            "evaluation_metrics": champ_metrics,
            "confusion_matrix": champ_cm,
            "all_evaluated_configurations": results,
            "data_sources": {
                "events": "NASA COOLR",
                "precipitation": "NASA GPM IMERG (1h, 6h, 24h, 3d, 7d)",
                "soil_moisture": "NASA/USDA SMAP",
                "elevation_and_slope": "Copernicus GLO-30 DEM",
            },
        }

        meta_path = target_dir / "model_metadata.json"
        with open(meta_path, "w") as f:
            json.dump(meta_payload, f, indent=2)

        # Also save metrics.json & model_manifest.json for existing loader
        with open(target_dir / "metrics.json", "w") as f:
            json.dump(meta_payload["evaluation_metrics"], f, indent=2)
        with open(target_dir / "model_manifest.json", "w") as f:
            json.dump(meta_payload, f, indent=2)

    print(f"\n[OK] Model saved:     {PROD_MODEL_DIR / 'apda_mitra_xgboost.pkl'}")
    print(f"[OK] Scaler saved:    {PROD_MODEL_DIR / 'feature_scaler.pkl'}")
    print(f"[OK] Columns saved:   {PROD_MODEL_DIR / 'feature_columns.json'}")
    print(f"[OK] Metadata saved:  {PROD_MODEL_DIR / 'model_metadata.json'}")
    print("[SUCCESS] Steps 4 & 5 completed with full high-recall evaluation!")


if __name__ == "__main__":
    main()
