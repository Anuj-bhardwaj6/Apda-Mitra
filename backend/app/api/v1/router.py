from fastapi import APIRouter
from app.api.v1.ai.router import router as ai_router
from app.api.v1.alerts.router import router as alerts_router
from app.api.v1.auth.router import router as auth_router
from app.api.v1.geocoding.router import router as geocoding_router
from app.api.v1.gis.router import router as gis_router
from app.api.v1.health.router import router as health_router
from app.api.v1.notifications.router import router as notifications_router
from app.api.v1.officer.router import router as officer_router
from app.api.v1.reports.router import router as reports_router
from app.api.v1.shelters.router import router as shelters_router
from app.api.v1.users.router import router as users_router
from app.api.v1.weather.router import router as weather_router

api_v1_router = APIRouter()

# Register sub-routers under /api/v1
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(weather_router)
api_v1_router.include_router(geocoding_router)
api_v1_router.include_router(gis_router)
api_v1_router.include_router(ai_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(shelters_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(officer_router)
