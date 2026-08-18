from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.admin import get_current_admin
from app.core.config import settings
from app.db.database import get_db

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal
from app.models.telemetry import Telemetry
from app.models.alert import Alert


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Administration"],
)


# =============================================================================
# ADMIN IDENTITY
# =============================================================================

@router.get("/me")
def admin_me(
    current_admin: User = Depends(get_current_admin),
):
    """
    Return the currently authenticated administrator.
    """

    return {
        "status": "authorized",
        "message": "Welcome to the HerdSense AI Admin Control Room",
        "admin": {
            "id": current_admin.id,
            "email": current_admin.email,
            "full_name": current_admin.full_name,
            "role": current_admin.role,
        },
    }


# =============================================================================
# ADMIN OVERVIEW
# =============================================================================

@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Central overview endpoint for the HerdSense AI Admin Control Room.

    Provides high-level statistics across:
    - Users
    - Farms
    - Animals
    - Telemetry
    - Alerts
    - System health
    """

    # =========================================================================
    # USERS
    # =========================================================================

    total_users = (
        db.query(func.count(User.id))
        .scalar()
        or 0
    )

    total_admins = (
        db.query(func.count(User.id))
        .filter(User.role == "admin")
        .scalar()
        or 0
    )

    total_farmers = (
        db.query(func.count(User.id))
        .filter(User.role == "farmer")
        .scalar()
        or 0
    )

    # =========================================================================
    # FARMS
    # =========================================================================

    total_farms = (
        db.query(func.count(Farm.id))
        .scalar()
        or 0
    )

    # =========================================================================
    # ANIMALS
    # =========================================================================

    total_animals = (
        db.query(func.count(Animal.id))
        .scalar()
        or 0
    )

    healthy_animals = (
        db.query(func.count(Animal.id))
        .filter(
            func.lower(Animal.health_status) == "healthy"
        )
        .scalar()
        or 0
    )

    # Animals that are not currently marked Healthy.
    animals_at_risk = (
        db.query(func.count(Animal.id))
        .filter(
            func.lower(Animal.health_status) != "healthy"
        )
        .scalar()
        or 0
    )

    # =========================================================================
    # TELEMETRY
    # =========================================================================

    total_telemetry = (
        db.query(func.count(Telemetry.id))
        .scalar()
        or 0
    )

    # =========================================================================
    # ALERTS
    # =========================================================================

    total_alerts = (
        db.query(func.count(Alert.id))
        .scalar()
        or 0
    )

    unresolved_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.resolved.is_(False))
        .scalar()
        or 0
    )

    critical_alerts = (
        db.query(func.count(Alert.id))
        .filter(
            Alert.severity == "critical",
            Alert.resolved.is_(False),
        )
        .scalar()
        or 0
    )

    warning_alerts = (
        db.query(func.count(Alert.id))
        .filter(
            Alert.severity == "warning",
            Alert.resolved.is_(False),
        )
        .scalar()
        or 0
    )

    resolved_alerts = (
        db.query(func.count(Alert.id))
        .filter(Alert.resolved.is_(True))
        .scalar()
        or 0
    )

    # =========================================================================
    # DATABASE HEALTH
    # =========================================================================

    database_status = "healthy"

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "unhealthy"

    # =========================================================================
    # SYSTEM RESPONSE
    # =========================================================================

    return {
        "status": "success",

        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "administrator": {
            "id": current_admin.id,
            "email": current_admin.email,
            "full_name": current_admin.full_name,
            "role": current_admin.role,
        },

        "system": {
            "api": "healthy",
            "database": database_status,
            "environment": settings.APP_ENV,
            "version": "1.0.0",
            "blockchain": settings.BASE_NETWORK,
        },

        "users": {
            "total": total_users,
            "admins": total_admins,
            "farmers": total_farmers,
        },

        "farms": {
            "total": total_farms,
        },

        "animals": {
            "total": total_animals,
            "healthy": healthy_animals,
            "at_risk": animals_at_risk,
        },

        "telemetry": {
            "total_records": total_telemetry,
        },

        "alerts": {
            "total": total_alerts,
            "unresolved": unresolved_alerts,
            "critical": critical_alerts,
            "warning": warning_alerts,
            "resolved": resolved_alerts,
        },
    }