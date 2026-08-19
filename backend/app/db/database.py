from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


# ============================================================================
# HERDSENSE AI — DATABASE ENGINE
# ============================================================================

DATABASE_URL = settings.DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured."
    )


# ============================================================================
# DATABASE URL NORMALIZATION
# ============================================================================

# Render commonly provides:
#   postgresql://...
#
# psycopg/SQLAlchemy works with:
#   postgresql+psycopg://...
#
# Normalize automatically so the same environment variable
# works locally and in production.

if DATABASE_URL.startswith("postgresql://"):

    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )

elif DATABASE_URL.startswith("postgres://"):

    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg://",
        1,
    )


# ============================================================================
# ENGINE
# ============================================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ============================================================================
# SESSION
# ============================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ============================================================================
# SQLALCHEMY BASE
# ============================================================================

Base = declarative_base()


# ============================================================================
# DATABASE SESSION DEPENDENCY
# ============================================================================

def get_db():
    """
    Provide a database session to FastAPI routes.

    The session is always closed after the request,
    including when an exception occurs.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def initialize_database():
    """
    Create all SQLAlchemy tables that do not already exist.

    This is intentionally safe to run repeatedly.

    Existing tables are NOT dropped or modified.
    SQLAlchemy only creates tables that are missing.
    """

    # Import every model before create_all().
    #
    # This is extremely important because SQLAlchemy only
    # knows about models that have been imported and registered
    # with Base.metadata.

    from app.models.user import User
    from app.models.farm import Farm
    from app.models.animal import Animal
    from app.models.telemetry import Telemetry
    from app.models.alert import Alert

    # Prevent unused-import optimizations / lint issues.
    _ = (
        User,
        Farm,
        Animal,
        Telemetry,
        Alert,
    )

    Base.metadata.create_all(
        bind=engine
    )