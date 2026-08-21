from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.database import Base, engine


# =============================================================================
# HERDSENSE AI — DATABASE MODELS
# =============================================================================
# IMPORTANT:
# Import every SQLAlchemy model BEFORE Base.metadata.create_all().
#
# Without these imports, SQLAlchemy may not know about the tables and
# create_all() will not create them.
# =============================================================================

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal
from app.models.telemetry import Telemetry
from app.models.alert import Alert


# =============================================================================
# ROUTERS
# =============================================================================

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
# CORS CONFIGURATION
# =============================================================================

allowed_origins = [
    # -------------------------------------------------------------------------
    # Local development
    # -------------------------------------------------------------------------
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:4173",
    "http://127.0.0.1:4173",

    # -------------------------------------------------------------------------
    # Render production frontend
    # -------------------------------------------------------------------------
    "https://herdsenseai-frontend.onrender.com",
]


# =============================================================================
# ADD FRONTEND URL FROM ENVIRONMENT
# =============================================================================

configured_frontend_url = getattr(
    settings,
    "FRONTEND_URL",
    None,
)

if configured_frontend_url:

    configured_frontend_url = (
        configured_frontend_url
        .strip()
        .rstrip("/")
    )

    if (
        configured_frontend_url
        and configured_frontend_url not in allowed_origins
    ):
        allowed_origins.append(
            configured_frontend_url
        )


# =============================================================================
# ADD CORS_ORIGINS FROM ENVIRONMENT
# =============================================================================
#
# Example Render environment variable:
#
# CORS_ORIGINS=https://herdsenseai-frontend.onrender.com,http://localhost:5173
#
# This allows us to add additional frontend domains without changing code.
# =============================================================================

configured_cors_origins = getattr(
    settings,
    "CORS_ORIGINS",
    None,
)

if configured_cors_origins:

    for origin in configured_cors_origins.split(","):

        origin = (
            origin
            .strip()
            .rstrip("/")
        )

        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)


# =============================================================================
# REMOVE DUPLICATES
# =============================================================================

allowed_origins = list(
    dict.fromkeys(allowed_origins)
)


print(
    "🌐 HerdSense AI CORS origins:",
    allowed_origins,
)


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

def initialize_database() -> None:
    """
    Initialize all SQLAlchemy tables.

    Existing tables are preserved.

    SQLAlchemy create_all() only creates tables that do not already exist.
    It does not delete existing tables or existing records.
    """

    print("HerdSense AI: initializing database...")

    try:

        Base.metadata.create_all(
            bind=engine
        )

        print(
            "HerdSense AI: database initialization completed."
        )

    except Exception as exc:

        print(
            "❌ HerdSense AI database initialization failed:"
        )

        print(
            repr(exc)
        )

        # Do not prevent the API from starting.
        #
        # This allows Render to expose the actual database/API error
        # instead of completely crashing the service.
        #
        # If the database is unavailable, individual database requests
        # will still fail and the logs will show the actual problem.


# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print(
        "🚀 Starting HerdSense AI API..."
    )

    # -------------------------------------------------------------------------
    # Initialize database
    # -------------------------------------------------------------------------

    initialize_database()

    print(
        "🚀 HerdSense AI API startup complete."
    )

    yield

    print(
        "🛑 HerdSense AI API shutting down."
    )


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(

    title="HerdSense AI API",

    description=(
        "Livestock monitoring, telemetry, intelligence, "
        "predictive analytics and Base blockchain integration API."
    ),

    version="1.0.0",

    lifespan=lifespan,
)


# =============================================================================
# CORS MIDDLEWARE
# =============================================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=allowed_origins,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


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

# -----------------------------------------------------------------------------
# ADMIN CONTROL ROOM
# -----------------------------------------------------------------------------

app.include_router(
    admin_router
)


# =============================================================================
# ROOT ENDPOINT
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