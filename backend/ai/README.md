# APDA MITRA — AI Landslide Early Warning & Risk Prediction Engine

> **Production-grade Machine Learning Subsystem for High-Precision Slope Failure and Landslide Risk Prediction in the North Eastern Region (NER) of India.**

---

## 🏔️ Overview

The Apda Mitra AI Landslide Subsystem is designed specifically for the complex geo-morphological terrain and extreme monsoon climatology of North East India (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura).

It combines:
1. **Remote Sensing & Topography:** NASA SRTM 30m Digital Elevation Models (elevation, slope, aspect, curvature, Topographic Wetness Index).
2. **Dynamic Climatology:** Real-time and historical multi-day rolling rainfall accumulation from Open-Meteo.
3. **Hydrology & Soil Physics:** Volumetric topsoil and sub-surface moisture saturation.
4. **Satellite Land Cover:** ESA WorldCover 10m high-resolution classification and NDVI vegetation proxies.
5. **Civil Infrastructure Proximity:** OpenStreetMap road cuttings and drainage river channel distances.
6. **Historical Clustering:** Gaussian Kernel Density Estimation (KDE) on NASA Global Landslide Catalog (GLC) events.
7. **Explainable AI (XAI):** Local feature attributions via `shap.TreeExplainer` providing interpretable risk drivers for disaster managers.
8. **Continuous Learning:** Automated pipeline assimilating verified citizen reports with metric guardrails and automated rollback.

---

## 📁 Subsystem Directory Structure

```
backend/ai/
├── config.py                 # Central configurations, bounding boxes, feature constants
├── logger.py                 # Structured JSON pipeline logger
├── requirements_ai.txt       # AI/ML dependency manifest
│
├── datasets/
│   ├── raw/                  # Downloaded raw rasters, shapefiles, CSVs
│   ├── processed/            # Cleaned GeoParquet tables
│   ├── training/             # Scaled training sets (training_dataset_scaled.parquet)
│   ├── models/               # Versioned model artifacts (model.joblib, scaler.joblib)
│   │   └── latest/           # Symlink/copy of active production model artifacts
│   ├── artifacts/            # SHAP plots, ROC/PR curves, cross-validation metrics
│   └── metadata/             # Schema definitions and manifest checksums
│
├── scripts/
│   ├── download/             # Automated downloaders (NASA GLC, Open-Meteo, SRTM, etc.)
│   │   ├── download_nasa.py
│   │   ├── download_openmeteo.py
│   │   ├── download_srtm.py
│   │   ├── download_smap.py
│   │   ├── download_worldcover.py
│   │   └── download_osm.py
│   ├── etl/                  # Data engineering pipeline
│   │   ├── clean.py
│   │   ├── validate.py
│   │   ├── merge.py
│   │   └── transform.py
│   ├── features/             # Feature extractors
│   │   ├── terrain.py
│   │   ├── weather.py
│   │   ├── soil.py
│   │   ├── satellite.py
│   │   ├── osm.py
│   │   └── historical.py
│   ├── training/             # Model training, CV, hyperparameter tuning
│   │   ├── train.py
│   │   ├── evaluate.py
│   │   ├── cross_validation.py
│   │   ├── hyperparameter_search.py
│   │   ├── predict.py
│   │   └── retrain_pipeline.py
│   ├── explainability/       # SHAP explainability engine
│   │   └── shap_explainer.py
│   └── deployment/           # Model loading singleton and inference service
│       ├── load_model.py
│       └── predict_api.py
│
└── docs/                     # Technical documentation
    ├── ARCHITECTURE.md
    ├── DATASET_DOCS.md
    ├── FEATURE_DOCS.md
    └── API_DOCS.md
```

---

## 🚀 Quick Start Guide

### 1. Data Ingestion & ETL
```bash
# Ingest catalog and environmental features
python ai/scripts/download/download_nasa.py
python ai/scripts/download/download_openmeteo.py

# Clean, validate, and assemble the training dataset
python ai/scripts/etl/clean.py
python ai/scripts/etl/merge.py
python ai/scripts/etl/transform.py
```

### 2. Model Training & Cross-Validation
```bash
# Train XGBoost model with early stopping & save production artifacts
python ai/scripts/training/train.py

# Run 5-fold stratified cross-validation
python ai/scripts/training/cross_validation.py --folds 5

# Optional: Optuna Bayesian hyperparameter optimization
python ai/scripts/training/hyperparameter_search.py --trials 50
```

### 3. Local Inference & Explainability Test
```bash
# Predict risk for Gangtok, Sikkim
python ai/scripts/training/predict.py

# Test SHAP explanation engine
python ai/scripts/explainability/shap_explainer.py
```

### 4. MLflow Experiment Tracking UI
To inspect training runs, hyperparameters, loss curves, and artifact plots:
```bash
mlflow ui --backend-store-uri backend/ai/mlruns
# Open http://127.0.0.1:5000 in your browser
```

---

## 🌐 FastAPI REST Integration

The AI subsystem is directly exposed through FastAPI under `/api/v1/ai/landslide/*`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/ai/landslide/predict` | Single coordinate risk prediction with SHAP explanation |
| `POST` | `/api/v1/ai/landslide/predict-batch` | Batch screening for multiple GIS nodes |
| `GET` | `/api/v1/ai/landslide/model` | Active model version, SHA-256 hash & evaluation metrics |
| `GET` | `/api/v1/ai/landslide/features` | Ranked feature importance coefficients |
| `POST` | `/api/v1/ai/landslide/retrain` | Trigger continuous learning pipeline |
| `GET` | `/api/v1/ai/landslide/retrain/status/{job_id}` | Poll background retraining job status |

---

## 🛡️ Model Integrity & Rollback Protocol

- **Integrity Validation:** Every model artifact package is signed with a SHA-256 digest in `model_manifest.json`. During startup and hot-reloading, `ModelManager` verifies binary integrity before loading.
- **Automated Rollback:** When `/retrain` is executed, the newly trained candidate model is benchmarked against the active production model. If the candidate's validation ROC AUC drops by more than `0.02` (configurable via `ROLLBACK_METRIC_TOLERANCE`), the candidate is rejected, the incumbent model remains promoted, and an audit warning is generated.
