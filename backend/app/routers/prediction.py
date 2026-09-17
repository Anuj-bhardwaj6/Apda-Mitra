"""
FastAPI Router for XGBoost Landslide Risk Prediction.
Endpoint: POST /api/v1/predict/landslide-risk
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status

from app.schemas.landslide_prediction import (
    LandslideRiskPredictionRequest,
    LandslideRiskPredictionResponse,
)
from app.services.ai.landslide_prediction_service import LandslidePredictionService

logger = logging.getLogger("apda_mitra.routers.prediction")

router = APIRouter(prefix="/predict", tags=["Prediction"])


@router.post(
    "/landslide-risk",
    response_model=LandslideRiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Landslide Hazard with Explainable AI (XGBoost + SHAP)",
    description=(
        "Evaluates quantitative landslide failure probability and major contributing factors "
        "using the trained Apda Mitra XGBoost model and TreeSHAP explainability. "
        "Strictly validates environmental features without synthetic substitution."
    ),
)
async def predict_landslide_risk(
    request: LandslideRiskPredictionRequest,
) -> LandslideRiskPredictionResponse:
    """
    Executes model inference and SHAP factor attribution for the given point coordinates
    and observed environmental features.
    """
    try:
        service = LandslidePredictionService.get_instance()
        response = service.predict(request)
        return response
    except ValueError as ve:
        logger.warning("Validation or data error in prediction: %s", ve)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error("Internal error during landslide risk prediction: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Landslide prediction service failed: {str(exc)}",
        )


@router.post(
    "/live",
    status_code=status.HTTP_200_OK,
    summary="Evaluate Live Landslide Hazard from Location Coordinates",
    description=(
        "Retrieves recent real-time Earth Observation telemetry (Copernicus DEM 30m, "
        "NASA POWER / GPM rainfall windows, NASA MERRA-2 soil moisture), computes identical "
        "training features, and executes the XGBoost model with SHAP explainability. "
        "Never returns fake values; raises HTTP 503 if required upstream data are unavailable."
    ),
)
async def predict_live_environmental_hazard(
    request: dict,
):
    from app.services.ai.live_environmental_service import (
        get_live_environmental_service,
        EnvironmentalDataUnavailableError,
    )
    lat = request.get("latitude")
    lon = request.get("longitude")
    target_date = request.get("date")

    if lat is None or lon is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="latitude and longitude are required.",
        )

    try:
        service = get_live_environmental_service()
        return await service.predict_live(
            latitude=float(lat),
            longitude=float(lon),
            target_date=target_date,
        )
    except EnvironmentalDataUnavailableError as err:
        logger.error("Environmental telemetry unavailable: %s", err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Required environmental data unavailable: {err.message}",
        )
    except ValueError as ve:
        logger.warning("Invalid coordinates: %s", ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error("Internal error during live hazard evaluation: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Environmental prediction pipeline error: {str(exc)}",
        )

