import time
from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_database_health
from app.core.redis import check_redis_health
from app.schemas.base import ApiResponse
from app.schemas.health import HealthCheckResponse
from app.services.external.open_meteo import OpenMeteoService

router = APIRouter(tags=["System Health & Diagnostics"])

START_TIME = time.time()


@router.get(
    "/health",
    response_model=ApiResponse[HealthCheckResponse],
    summary="Comprehensive System Health Check",
    description="Probes PostgreSQL database connectivity, PostGIS spatial extension, Redis cache, and external APIs.",
)
async def get_system_health() -> ApiResponse[HealthCheckResponse]:
    db_health = await check_database_health()
    redis_health = await check_redis_health()
    open_meteo_health = await OpenMeteoService.check_health()

    is_healthy = db_health.get("connected", False) and redis_health.get("connected", False)

    uptime = round(time.time() - START_TIME, 2)
    payload = HealthCheckResponse(
        status="healthy" if is_healthy else "degraded",
        database=db_health,
        redis=redis_health,
        external_services={"open_meteo": open_meteo_health},
        version=settings.VERSION,
        uptime_seconds=uptime,
        environment=settings.ENVIRONMENT,
    )

    msg = "All systems operational." if is_healthy else "Some subsystems report degraded status."
    return ApiResponse.ok(data=payload, message=msg)
