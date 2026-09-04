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
from app.routers.wallet import router as wallet_router


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

    # -------------------------------------------------------------------------
    # Cloudflare Pages production frontend
    # -------------------------------------------------------------------------
    "https://herdsenseai.pages.dev",
]


# =============================================================================
# CLOUDFLARE PAGES PREVIEW ORIGINS
# =============================================================================
#
# Cloudflare Pages creates preview deployments with hostnames such as:
#
#     https://930bf764.herdsenseai.pages.dev
#
# The preview identifier changes between deployments, so adding individual
# preview URLs to allow_origins would be fragile.
#
# This regex allows any HTTPS subdomain directly under:
#
#     herdsenseai.pages.dev
#
# while NOT allowing arbitrary external domains.
# =============================================================================

allowed_origin_regex = (
    r"^https://([a-zA-Z0-9-]+\.)?herdsenseai\.pages\.dev$"
)


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
# Example:
#
# CORS_ORIGINS=https://herdsenseai-frontend.onrender.com,http://localhost:5173
#
# This allows additional frontend domains without changing code.
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
            allowed_origins.append(
                origin
            )


# =============================================================================
# REMOVE DUPLICATES
# =============================================================================

allowed_origins = list(
    dict.fromkeys(allowed_origins)
)


# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    # -------------------------------------------------------------------------
    # DATABASE INITIALIZATION
    # -------------------------------------------------------------------------
    #
    # Existing HerdSense tables are created when they do not already exist.
    #
    # IMPORTANT:
    # create_all() does NOT modify an existing table to add new columns.
    # The wallet column therefore still needs a database migration/update.
    #

    Base.metadata.create_all(
        bind=engine
    )

    yield


# =============================================================================
# FASTAPI APPLICATION
# =============================================================================

app = FastAPI(
    title="HerdSense AI API",
    version="1.0.0",
    lifespan=lifespan,
)


# =============================================================================
# CORS MIDDLEWARE
# =============================================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=allowed_origins,

    allow_origin_regex=allowed_origin_regex,

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

app.include_router(base_router)

app.include_router(admin_router)

app.include_router(wallet_router)


# =============================================================================
# ROOT
# =============================================================================

@app.get("/")
def root():

    return {
        "message": "Welcome to HerdSense AI",
        "status": "Running",
    }


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
def health():

    return {
        "server": "Healthy",
    }