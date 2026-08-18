from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal
from app.models.telemetry import Telemetry

from app.schemas.dashboard import DashboardResponse

from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["Dashboard"]
)


# ============================================================
# DASHBOARD
# ============================================================

@router.get(
    "/",
    response_model=DashboardResponse
)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # ========================================================
    # TOTAL FARMS
    # ========================================================

    total_farms = (
        db.query(Farm)
        .filter(
            Farm.owner_id == current_user.id
        )
        .count()
    )


    # ========================================================
    # USER'S ANIMALS
    # ========================================================

    animals = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Farm.owner_id == current_user.id
        )
    )


    # ========================================================
    # TOTAL ANIMALS
    # ========================================================

    total_animals = animals.count()


    # ========================================================
    # HEALTH STATUS
    # ========================================================

    healthy_animals = (
        animals
        .filter(
            Animal.health_status == "Healthy"
        )
        .count()
    )


    warning_animals = (
        animals
        .filter(
            Animal.health_status == "Warning"
        )
        .count()
    )


    critical_animals = (
        animals
        .filter(
            Animal.health_status == "Critical"
        )
        .count()
    )


    # ========================================================
    # AVERAGE TELEMETRY TEMPERATURE
    # ========================================================
    #
    # IMPORTANT:
    # We calculate this from Telemetry instead of
    # Animal.temperature.
    #
    # This means the dashboard reflects actual
    # sensor readings stored in the telemetry table.
    # ========================================================

    average_temperature = (
        db.query(
            func.avg(
                Telemetry.temperature
            )
        )
        .join(
            Animal,
            Telemetry.animal_id == Animal.id
        )
        .join(
            Farm,
            Animal.farm_id == Farm.id
        )
        .filter(
            Farm.owner_id == current_user.id
        )
        .scalar()
    )


    # ========================================================
    # RETURN DASHBOARD DATA
    # ========================================================

    return DashboardResponse(
        total_farms=total_farms,

        total_animals=total_animals,

        healthy_animals=healthy_animals,

        warning_animals=warning_animals,

        critical_animals=critical_animals,

        average_temperature=round(
            average_temperature or 0,
            2
        )
    )