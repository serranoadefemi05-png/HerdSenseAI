from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.routers.auth import router as auth_router
from app.routers.farm import router as farm_router
from app.routers.animal import router as animal_router
from app.routers.telemetry import router as telemetry_router
from app.routers.dashboard import router as dashboard_router
from app.routers.alert import router as alert_router
from app.routers.websocket import router as websocket_router
from app.routers.intelligence import router as intelligence_router
from app.routers.disease_risk import router as disease_risk_router
from app.routers.base import router as base_router


# =============================================================================
# HERDSENSE AI — FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="HerdSense AI API",
    description=(
        "Livestock monitoring, telemetry, intelligence, "
        "predictive analytics and Base blockchain integration API."
    ),
    version="1.0.0",
)


# =============================================================================
# CORS
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ROUTERS
# =============================================================================

app.include_router(auth_router)

app.include_router(farm_router)

app.include_router(animal_router)

app.include_router(telemetry_router)

app.include_router(dashboard_router)

app.include_router(alert_router)

app.include_router(websocket_router)

app.include_router(intelligence_router)

app.include_router(disease_risk_router)

# Base blockchain integration
app.include_router(base_router)


# =============================================================================
# ROOT
# =============================================================================

@app.get("/")
def root():
    return {
        "message": "Welcome to HerdSense AI",
        "status": "Running",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "blockchain": settings.BASE_NETWORK,
    }


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
def health_check():
    return {
        "server": "Healthy",
        "service": "HerdSense AI API",
        "environment": settings.APP_ENV,
        "blockchain": settings.BASE_NETWORK,
    }
