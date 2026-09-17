# AI Landslide Engine — API Reference Documentation

All endpoints are served under the FastAPI `/api/v1/ai/landslide` prefix.

---

## 1. Single Point Prediction

- **Endpoint:** `POST /api/v1/ai/landslide/predict`
- **Description:** Computes real-time landslide risk probability, risk level, actionable civil defence instructions, and local SHAP feature attributions.

### Request Body
```json
{
  "latitude": 27.3389,
  "longitude": 88.6065,
  "rainfall_24h": 75.0,
  "rainfall_72h": 140.0,
  "slope": 32.5,
  "include_shap": true,
  "generate_plot": false
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Landslide risk successfully evaluated.",
  "data": {
    "latitude": 27.3389,
    "longitude": 88.6065,
    "probability": 0.8142,
    "risk_level": "VERY_HIGH",
    "confidence": 0.92,
    "source": "xgboost_ner_model",
    "model_version": "v20260909_120000",
    "timestamp": "2026-09-10T09:45:00Z",
    "recommendation": {
      "alert_level": "ORANGE",
      "action_title": "PRE-EMPTIVE EVACUATION ADVISORY",
      "civil_defence_action": "Place emergency rescue units on standby. Inspect critical road corridors (NH-10).",
      "citizen_instructions": [
        "Prepare emergency survival kits (documents, flashlights, first aid, medicine).",
        "Identify nearest safe shelter routes via Apda Mitra offline map.",
        "Refrain from night driving on mountain highways."
      ],
      "shelter_activation": true
    },
    "features": {
      "latitude": 27.3389,
      "longitude": 88.6065,
      "elevation": 1650.0,
      "slope": 32.5,
      "rainfall_24h": 75.0,
      "rainfall_72h": 140.0,
      "topographic_wetness_index": 8.1
    },
    "explanation": {
      "base_value": 0.20,
      "method": "shap_tree_explainer",
      "top_risk_drivers": [
        { "feature": "rainfall_24h", "value": 75.0, "shap_value": 0.32 },
        { "feature": "slope", "value": 32.5, "shap_value": 0.28 }
      ],
      "top_mitigating_factors": [
        { "feature": "distance_to_river_m", "value": 650.0, "shap_value": -0.06 }
      ]
    }
  }
}
```

---

## 2. Batch Coordinate Screening

- **Endpoint:** `POST /api/v1/ai/landslide/predict-batch`
- **Description:** Evaluates multiple geospatial nodes concurrently (e.g. across a highway network or district grid).

### Request Body
```json
{
  "points": [
    { "latitude": 27.33, "longitude": 88.61 },
    { "latitude": 25.57, "longitude": 91.89 }
  ],
  "include_shap": false
}
```

---

## 3. Active Model Metadata & Verification

- **Endpoint:** `GET /api/v1/ai/landslide/model`
- **Description:** Returns production model version, SHA-256 verification digest, feature count, and evaluation metrics (ROC AUC, PR AUC, F1).

---

## 4. Feature Importance Ranking

- **Endpoint:** `GET /api/v1/ai/landslide/features`
- **Description:** Returns the global feature importance weights from the active XGBoost model.

---

## 5. Continuous Retraining Job Trigger

- **Endpoint:** `POST /api/v1/ai/landslide/retrain`
- **Description:** Triggers asynchronous ingestion of verified citizen incident reports and retrains the candidate model.

### Request Body
```json
{
  "min_samples": 50,
  "force": false,
  "comment": "Post-monsoon scheduled calibration"
}
```

---

## 6. Poll Retraining Status

- **Endpoint:** `GET /api/v1/ai/landslide/retrain/status/{job_id}`
- **Description:** Queries real-time status of a dispatched retraining job (`PENDING`, `RUNNING`, `COMPLETED`, `ROLLED_BACK`, or `FAILED`).
