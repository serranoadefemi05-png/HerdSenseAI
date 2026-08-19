from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import Base, engine, SessionLocal

# =============================================================================
# SQLALCHEMY MODELS
# =============================================================================
# IMPORTANT:
# Every model must be imported before create_all() so SQLAlchemy knows about
# every table.
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
# CORS
# =============================================================================

allowed_origins = [
    # Local development
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",

    # Production frontend
    "https://herdsenseai-frontend.onrender.com",
]


# Add configured frontend URL.
configured_frontend_url = getattr(
    settings,
    "FRONTEND_URL",
    "",
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


# Add additional origins from CORS_ORIGINS.
configured_cors_origins = getattr(
    settings,
    "CORS_ORIGINS",
    "",
)

if configured_cors_origins:
    for origin in configured_cors_origins.split(","):
        origin = origin.strip().rstrip("/")

        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)


# Remove duplicates.
allowed_origins = list(
    dict.fromkeys(allowed_origins)
)


print(
    "🌐 Allowed CORS origins:",
    allowed_origins,
)


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

def initialize_database():
    """
    Create missing database tables.

    Existing tables are preserved.
    No existing data is deleted.
    """

    try:
        Base.metadata.create_all(
            bind=engine
        )

        print(
            "✅ Database initialization successful."
        )

    except Exception as exc:
        print(
            "❌ Database initialization failed:"
        )
        print(
            repr(exc)
        )

        # Do not silently pretend the database is healthy.
        raise


# =============================================================================
# ADMIN ACCOUNT BOOTSTRAP
# =============================================================================

def ensure_admin_account(
    db: Session,
    email: str,
    password: str,
    admin_number: int,
):
    """
    Ensure that a configured permanent admin account exists.

    If the account does not exist:
        create it.

    If it already exists:
        make sure its role remains admin.

    The password is NOT replaced automatically when an account already exists.
    This prevents a restart from unexpectedly changing an administrator's
    password.

    Admin credentials remain server-side environment variables.
    """

    email = (email or "").strip().lower()
    password = password or ""

    if not email or not password:
        print(
            f"⚠️ Admin #{admin_number} credentials are not configured."
        )
        return

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # -------------------------------------------------------------------------
    # CREATE ADMIN
    # -------------------------------------------------------------------------

    if user is None:

        admin_user = User(
            email=email,
            full_name=f"HerdSense AI Admin {admin_number}",
            hashed_password=hash_password(password),
            role="admin",
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print(
            f"✅ Admin #{admin_number} created: {email}"
        )

        return

    # -------------------------------------------------------------------------
    # EXISTING ACCOUNT
    # -------------------------------------------------------------------------

    changed = False

    if user.role != "admin":
        user.role = "admin"
        changed = True

    if changed:
        db.commit()

        print(
            f"✅ Admin #{admin_number} role restored: {email}"
        )

    else:
        print(
            f"✅ Admin #{admin_number} already exists: {email}"
        )


def initialize_admin_accounts():
    """
    Create/verify the two permanent administrator accounts.
    """

    db = SessionLocal()

    try:

        ensure_admin_account(
            db=db,
            email=settings.ADMIN_EMAIL,
            password=settings.ADMIN_PASSWORD,
            admin_number=1,
        )

        ensure_admin_account(
            db=db,
            email=settings.ADMIN_EMAIL_2,
            password=settings.ADMIN_PASSWORD_2,
            admin_number=2,
        )

    except Exception as exc:

        db.rollback()

        print(
            "❌ Admin account initialization failed:"
        )
        print(
            repr(exc)
        )

        raise

    finally:
        db.close()


# =============================================================================
# APPLICATION LIFESPAN
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print(
        "🚀 Starting HerdSense AI API..."
    )

    # -------------------------------------------------------------------------
    # DATABASE
    # -------------------------------------------------------------------------

    initialize_database()

    # -------------------------------------------------------------------------
    # ADMIN ACCOUNTS
    # -------------------------------------------------------------------------

    initialize_admin_accounts()

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
# HEALTH
# =============================================================================

@app.get("/health")
def health_check():

    return {
        "server": "Healthy",
        "service": "HerdSense AI API",
        "environment": settings.APP_ENV,
        "blockchain": settings.BASE_NETWORK,
    }