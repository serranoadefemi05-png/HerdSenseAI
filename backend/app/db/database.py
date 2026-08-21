import os
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


# =============================================================================
# HERDSENSE AI — DATABASE CONFIGURATION
# =============================================================================

def get_database_url() -> str:
    """
    Get and normalize the PostgreSQL DATABASE_URL.

    Supports:
        postgresql://...
        postgres://...
        postgresql+psycopg://...

    Render commonly supplies:
        postgresql://...

    SQLAlchemy + psycopg uses:
        postgresql+psycopg://...
    """

    database_url = getattr(settings, "DATABASE_URL", None)

    # Fallback directly to environment variable.
    if not database_url:
        database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured.\n"
            "Set DATABASE_URL in your local .env file or Render environment variables."
        )

    database_url = database_url.strip().strip('"').strip("'")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is empty.\n"
            "Set a valid PostgreSQL connection URL."
        )

    # -------------------------------------------------------------------------
    # Normalize PostgreSQL schemes
    # -------------------------------------------------------------------------

    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://",
            "postgresql+psycopg://",
            1,
        )

    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1,
        )

    elif database_url.startswith("postgresql+psycopg://"):
        pass

    else:
        raise RuntimeError(
            "Invalid DATABASE_URL.\n\n"
            "Expected a PostgreSQL URL beginning with:\n"
            "postgresql+psycopg://\n\n"
            "or the standard PostgreSQL format:\n"
            "postgresql://"
        )

    # -------------------------------------------------------------------------
    # Validate that the URL can actually be parsed.
    # -------------------------------------------------------------------------

    try:
        parsed = urlparse(database_url)

        if parsed.scheme != "postgresql+psycopg":
            raise ValueError("Invalid PostgreSQL scheme.")

        if not parsed.hostname:
            raise ValueError("Database hostname is missing.")

        if not parsed.path or parsed.path == "/":
            raise ValueError("Database name is missing.")

    except Exception as exc:
        raise RuntimeError(
            "DATABASE_URL could not be parsed.\n"
            "Make sure the Render PostgreSQL Internal Database URL is copied "
            "correctly."
        ) from exc

    return database_url


# =============================================================================
# DATABASE URL
# =============================================================================

DATABASE_URL = get_database_url()


# =============================================================================
# SQLALCHEMY ENGINE
# =============================================================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
)


# =============================================================================
# SESSION
# =============================================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# =============================================================================
# DECLARATIVE BASE
# =============================================================================

Base = declarative_base()


# =============================================================================
# DATABASE DEPENDENCY
# =============================================================================

def get_db():
    """
    Provide a SQLAlchemy database session to FastAPI routes.

    The session is always closed after the request,
    including when an exception occurs.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()