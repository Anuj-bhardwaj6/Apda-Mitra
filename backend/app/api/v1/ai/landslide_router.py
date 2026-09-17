from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.base import ApiResponse
from app.schemas.landslide import (
    FeatureImportanceResponse,
    GeofenceAlertRequest,
    GeofenceAlertResponse,
    LandslideBatchRequest,
    LandslideRiskRequest,
    LandslideRiskResponse,
    ModelMetadataResponse,
    RetrainRequest,
    RetrainStatusResponse,
    RoadmapLivePredictionRequest,
    RoadmapLivePredictionResponse,
)
from app.services.ai.landslide_service import LandslideService

router = APIRouter(prefix="/landslide", tags=["AI Landslide Early Warning Engine"])


@router.post(
    "/predict",
    response_model=ApiResponse[LandslideRiskResponse],
    summary="Predict Landslide Vulnerability with SHAP Attribution",
)
async def predict_landslide(
    payload: LandslideRiskRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[LandslideRiskResponse]:
    """
    Evaluates real-time landslide risk at a specific coordinate in the North Eastern Region.
    Fuses SRTM terrain topography, Open-Meteo precipitation windows, soil saturation,
    satellite cover, and historical failure catalogs with XGBoost and SHAP.
    """
    try:
        result = LandslideService.predict_risk(payload, db_session=db)
        return ApiResponse.ok(data=result, message="Landslide risk successfully evaluated.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(exc)}",
        )


@router.post(
    "/predict-batch",
    response_model=ApiResponse[List[LandslideRiskResponse]],
    summary="Screen Multiple Geospatial Nodes for Landslide Risk",
)
async def predict_landslide_batch(
    payload: LandslideBatchRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[List[LandslideRiskResponse]]:
    """Evaluates an array of coordinates, returning risk tiers and civil defence actions for each."""
    try:
        results = LandslideService.predict_batch(payload, db_session=db)
        return ApiResponse.ok(data=results, message=f"Batch processed {len(results)} locations.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference error: {str(exc)}",
        )


@router.get(
    "/model",
    response_model=ApiResponse[ModelMetadataResponse],
    summary="Retrieve Active Model Metadata & Integrity",
)
async def get_model_info() -> ApiResponse[ModelMetadataResponse]:
    """Returns active model version, SHA-256 verification hash, feature count, and evaluation metrics."""
    try:
        meta = LandslideService.get_model_metadata()
        return ApiResponse.ok(data=meta, message="Model metadata retrieved.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Metadata error: {str(exc)}",
        )


@router.get(
    "/features",
    response_model=ApiResponse[FeatureImportanceResponse],
    summary="List Model Features and Global Importances",
)
async def get_model_features() -> ApiResponse[FeatureImportanceResponse]:
    """Returns the complete list of 22 predictive features and their relative weights."""
    try:
        fi = LandslideService.get_feature_importance()
        return ApiResponse.ok(data=fi, message="Feature importance ranked.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feature retrieval error: {str(exc)}",
        )


@router.post(
    "/retrain",
    response_model=ApiResponse[RetrainStatusResponse],
    summary="Trigger Continuous Learning / Retraining Job",
)
async def trigger_retraining(
    payload: RetrainRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[RetrainStatusResponse]:
    """
    Ingests newly verified citizen incident reports and triggers continuous retraining.
    Performs automated rollback if the new candidate model does not satisfy AUC tolerances.
    """
    try:
        job = await LandslideService.trigger_retraining(payload, db_session=db)
        return ApiResponse.ok(data=job, message="Retraining pipeline triggered.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining error: {str(exc)}",
        )


@router.get(
    "/retrain/status/{job_id}",
    response_model=ApiResponse[RetrainStatusResponse],
    summary="Check Retraining Job Status",
)
async def get_retrain_status(job_id: str) -> ApiResponse[RetrainStatusResponse]:
    """Polls execution status, performance comparison, and version changes for a retrain job."""
    try:
        status_info = LandslideService.get_retrain_status(job_id)
        return ApiResponse.ok(data=status_info, message="Retraining status fetched.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job status error: {str(exc)}",
        )


@router.get(
    "/compare",
    response_model=ApiResponse[dict],
    summary="Retrieve XGBoost v1 vs v2 Comparative Benchmark",
)
async def get_model_comparison() -> ApiResponse[dict]:
    """
    Compares XGBoost v1 baseline (13 features: NASA COOLR, GPM IMERG, SMAP, Copernicus GLO-30)
    with XGBoost v2 multi-sensor candidate (+ Sentinel-1 SAR, Sentinel-2 Optical, NASA LHASA v2.0 Nowcast).
    """
    try:
        comparison = LandslideService.get_model_comparison()
        return ApiResponse.ok(data=comparison, message="Model comparison benchmark retrieved.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison error: {str(exc)}",
        )


@router.post(
    "/live-predict",
    response_model=ApiResponse[RoadmapLivePredictionResponse],
    summary="Live NASA Satellite Telemetry Ingestion -> XGBoost Inference -> 87% CRITICAL",
)
async def live_predict(
    payload: RoadmapLivePredictionRequest,
) -> ApiResponse[RoadmapLivePredictionResponse]:
    """
    Roadmap Steps 6, 7 & 10:
    Queries live NASA GPM IMERG & SMAP satellite telemetry, applies Copernicus DEM slope,
    runs production XGBoost champion model, computes risk percentage (e.g. 87% CRITICAL),
    and delivers AI explainability attribution and 5 km safe zone guidance.
    """
    try:
        result = await LandslideService.predict_roadmap_live(payload)
        return ApiResponse.ok(data=result, message="Live NASA telemetry ingested and evaluated.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Live prediction pipeline error: {str(exc)}",
        )


@router.post(
    "/geofence-alert",
    response_model=ApiResponse[GeofenceAlertResponse],
    summary="5 km Geofence Alert Trigger for Opted-In Citizens",
)
async def check_geofence(
    payload: GeofenceAlertRequest,
) -> ApiResponse[GeofenceAlertResponse]:
    """
    Roadmap Step 9:
    Evaluates citizen distance relative to active CRITICAL landslide risk nodes.
    If opted-in user is within the 5 km geofence radius, triggers instant high-priority
    push notification with siren vibration pattern and safe shelter navigation.
    """
    try:
        result = LandslideService.check_geofence_alert(payload)
        return ApiResponse.ok(data=result, message="Geofence alert status verified.")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Geofence alert verification error: {str(exc)}",
        )


