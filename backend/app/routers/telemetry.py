from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.animal import Animal
from app.models.farm import Farm
from app.models.telemetry import Telemetry
from app.models.user import User

from app.schemas.telemetry import (
    TelemetryCreate,
    TelemetryResponse,
)

from app.services.telemetry_service import (
    process_telemetry,
)


router = APIRouter(
    prefix="/api/v1/telemetry",
    tags=["Telemetry"],
)


# ============================================================================
# OWNERSHIP
# ============================================================================

def get_owned_animal(
    animal_id: int,
    db: Session,
    current_user: User,
) -> Animal:
    """
    Return an animal only when it belongs to a farm
    owned by the authenticated user.
    """

    animal = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Animal.id == animal_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not animal:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found",
        )

    return animal


# ============================================================================
# GET ALL TELEMETRY
# ============================================================================

@router.get(
    "/",
    response_model=list[TelemetryResponse],
)
def get_telemetry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return telemetry belonging only to the authenticated
    user's farms.
    """

    telemetry = (
        db.query(Telemetry)
        .join(Animal)
        .join(Farm)
        .filter(
            Farm.owner_id == current_user.id,
        )
        .order_by(
            Telemetry.timestamp.desc(),
        )
        .all()
    )

    return telemetry


# ============================================================================
# CREATE TELEMETRY
# ============================================================================

@router.post(
    "/",
    response_model=TelemetryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_telemetry(
    telemetry_data: TelemetryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Canonical REST telemetry ingestion endpoint.

    Used by:

    - Manual telemetry entry
    - External API clients
    - Future device integrations

    Physical MQTT telemetry enters the same canonical
    process_telemetry() service directly.

    No separate /manual endpoint exists.
    """

    animal = get_owned_animal(
        animal_id=telemetry_data.animal_id,
        db=db,
        current_user=current_user,
    )

    result = await process_telemetry(
        db=db,
        animal=animal,
        telemetry_data=telemetry_data,
    )

    return result["telemetry"]


# ============================================================================
# GET TELEMETRY FOR ONE ANIMAL
# ============================================================================

@router.get(
    "/animal/{animal_id}",
    response_model=list[TelemetryResponse],
)
def get_animal_telemetry(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return telemetry history for an animal owned by
    the current user.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    telemetry = (
        db.query(Telemetry)
        .filter(
            Telemetry.animal_id == animal.id,
        )
        .order_by(
            Telemetry.timestamp.desc(),
        )
        .all()
    )

    return telemetry


# ============================================================================
# GET SINGLE TELEMETRY
# ============================================================================

@router.get(
    "/{telemetry_id}",
    response_model=TelemetryResponse,
)
def get_single_telemetry(
    telemetry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return one telemetry record only when the associated
    animal belongs to the authenticated user's farm.
    """

    telemetry = (
        db.query(Telemetry)
        .join(Animal)
        .join(Farm)
        .filter(
            Telemetry.id == telemetry_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not telemetry:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Telemetry not found",
        )

    return telemetry