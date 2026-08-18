from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


# ============================================================================
# HERDSENSE AI — DATABASE ENGINE
# ============================================================================

DATABASE_URL = settings.DATABASE_URL

# Render commonly provides PostgreSQL URLs beginning with:
# postgresql://
#
# SQLAlchemy with psycopg expects:
# postgresql+psycopg://
#
# Normalize the URL automatically so the same environment variable works
# locally and in production.
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


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()


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