from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import initialize_database

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
from app.routers.admin import router as admin_router


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

ALLOWED_ORIGINS = [
    # Production
    "https://herdsenseai-frontend.onrender.com",

    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


# =============================================================================
# ENVIRONMENT FRONTEND URL
# =============================================================================

try:

    configured_frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        None,
    )

    if configured_frontend_url:

        configured_frontend_url = (
            str(
                configured_frontend_url
            )
            .strip()
            .rstrip("/")
        )

        if (
            configured_frontend_url
            and configured_frontend_url
            not in ALLOWED_ORIGINS
        ):
            ALLOWED_ORIGINS.append(
                configured_frontend_url
            )

except Exception as exc:

    print(
        "WARNING: Unable to read FRONTEND_URL:",
        exc,
    )


# Remove duplicates while preserving order.

ALLOWED_ORIGINS = list(
    dict.fromkeys(
        ALLOWED_ORIGINS
    )
)


print(
    "HerdSense AI CORS origins:",
    ALLOWED_ORIGINS,
)


# =============================================================================
# CORS MIDDLEWARE
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# =============================================================================
# DATABASE STARTUP
# =============================================================================

@app.on_event("startup")
def startup_database():

    print(
        "HerdSense AI: initializing database..."
    )

    try:

        initialize_database()

        print(
            "HerdSense AI: database initialization completed."
        )

    except Exception as exc:

        print(
            "HerdSense AI: database initialization FAILED."
        )

        print(
            f"Database error: {exc}"
        )

        # Re-raise so Render marks the deployment
        # unhealthy instead of silently running
        # a broken application.

        raise


# =============================================================================
# ROUTERS
# =============================================================================

app.include_router(
    auth_router
)

app.include_router(
    farm_router
)

app.include_router(
    animal_router
)

app.include_router(
    telemetry_router
)

app.include_router(
    dashboard_router
)

app.include_router(
    alert_router
)

app.include_router(
    websocket_router
)

app.include_router(
    intelligence_router
)

app.include_router(
    disease_risk_router
)

app.include_router(
    base_router
)

app.include_router(
    admin_router
)


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


# =============================================================================
# CORS CHECK
# =============================================================================

@app.get("/cors-check")
def cors_check():

    return {
        "status": "ok",
        "frontend": (
            "https://herdsenseai-frontend.onrender.com"
        ),
        "cors_configured": True,
        "allowed_origins": ALLOWED_ORIGINS,
    }