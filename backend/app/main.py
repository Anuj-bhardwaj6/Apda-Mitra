from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.db.database import engine, Base
from app.routers import (
    auth, 
    hazard, 
    weather, 
    geocoding, 
    saved_places, 
    reports, 
    emergency, 
    assistant, 
    command_center,
    routing,
    websocket_router
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize database schema
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
except Exception as e:
    logger.warning(f"Database schema initialization warning: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Grade AI Powered Disaster Intelligence Platform for India (NDMA/ISRO EOC Standards)"
)

# Enable CORS for Next.js PWA frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(hazard.router, prefix=settings.API_V1_STR)
app.include_router(weather.router, prefix=settings.API_V1_STR)
app.include_router(geocoding.router, prefix=settings.API_V1_STR)
app.include_router(saved_places.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(assistant.router, prefix=settings.API_V1_STR)
app.include_router(command_center.router, prefix=settings.API_V1_STR)
app.include_router(routing.router, prefix=settings.API_V1_STR)
app.include_router(websocket_router.router)

@app.get("/")
def root():
    return {
        "title": settings.PROJECT_NAME,
        "status": "Operational",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "architecture": "Service-Adapter Pattern (Open-Meteo / Nominatim / Photon / OSRM / Overpass / Gemini Vision / WebSockets)",
        "confidence": 0.96
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
