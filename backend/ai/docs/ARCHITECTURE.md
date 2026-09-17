# AI Landslide Engine — System Architecture

## End-to-End Subsystem Topology

```mermaid
flowchart TD
    subgraph Data_Ingestion["Data Ingestion & Remote Sensing"]
        A1["NASA GLC / COOLR Catalog"] --> E1["clean.py & validate.py"]
        A2["SRTM 30m DEM Tiles"] --> E1
        A3["Open-Meteo Weather API"] --> E1
        A4["ESA WorldCover 10m Rasters"] --> E1
        A5["OpenStreetMap Road/River GPKG"] --> E1
        A6["Verified Citizen Reports (PostgreSQL)"] --> E1
    end

    subgraph ETL_Pipeline["ETL & Feature Engineering"]
        E1 --> M1["merge.py (Spatial Join & Negative Sampling)"]
        M1 --> T1["transform.py (StandardScaler & Cyclical Encoding)"]
        T1 --> D1[("training_dataset_scaled.parquet")]
    end

    subgraph Training_Evaluation["Training & MLflow Tracking"]
        D1 --> TR1["train.py (XGBoostClassifier with Early Stopping)"]
        D1 --> CV1["cross_validation.py (5-Fold Stratified CV)"]
        D1 --> OPT1["hyperparameter_search.py (Optuna TPE)"]
        TR1 --> EV1["evaluate.py (ROC AUC, PR AUC, Curves)"]
        TR1 --> MLF[("MLflow Tracking Server (mlruns/)")]
    end

    subgraph Production_Deployment["Model Deployment & Explainability"]
        TR1 --> MOD[("models/latest/ (model.joblib, scaler.joblib, manifest.json)")]
        MOD --> LM["load_model.py (Thread-safe Singleton with SHA-256 Checksum)"]
        LM --> SHAP["shap_explainer.py (TreeExplainer & Fallback Engine)"]
        LM --> INF["predict_api.py (Inference Service Layer)"]
    end

    subgraph Application_Layer["FastAPI Application & Client Tier"]
        INF --> API["landslide_router.py (/api/v1/ai/landslide/*)"]
        API --> FE["Apda Mitra Web & PWA Frontend (Next.js / Leaflet)"]
        API --> GIS["Civil Defence Incident Command Dashboard"]
    end
```

## Continuous Learning & Rollback Loop

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Disaster Response Admin
    participant API as FastAPI Landslide Router
    participant Service as LandslideService
    participant Pipeline as RetrainPipeline
    participant DB as PostGIS incident_reports
    participant Trainer as train.py
    participant ModelMgr as ModelManager Singleton

    Admin->>API: POST /api/v1/ai/landslide/retrain
    API->>Service: trigger_retraining(RetrainRequest)
    Service->>Pipeline: dispatch_retraining_job(min_samples)
    Note over Pipeline: Spawn background thread
    Service-->>API: 200 OK (Job status: RUNNING)
    API-->>Admin: RetrainStatusResponse

    Pipeline->>DB: Query verified landslide citizen reports
    Pipeline->>Pipeline: Extract environmental features for reports
    Pipeline->>Pipeline: Append to training_dataset.parquet
    Pipeline->>Trainer: train(save=True)
    Trainer-->>Pipeline: Candidate Model (Metrics & Version)

    alt Candidate ROC AUC < Incumbent ROC AUC - 0.02
        Note over Pipeline: Degradation Detected!
        Pipeline->>Pipeline: Abort promotion; keep incumbent production artifacts
        Pipeline-->>ModelMgr: Retain current version
    else Candidate Metrics Valid
        Pipeline->>Pipeline: Promote candidate files to models/latest/
        Pipeline->>ModelMgr: reload() (Hot-reloads binary into memory)
    end
```
