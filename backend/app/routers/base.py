from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal

from app.services.base_service import (
    get_animal_data_hash,
    blockchain_configuration,
)


router = APIRouter(
    prefix="/api/v1/base",
    tags=["Base Blockchain"],
)


# ============================================================
# BASE STATUS
# ============================================================

@router.get("/status")
def get_base_status(
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Return the current HerdSense/Base
    integration configuration.
    """

    return {
        "status": "ready",
        "blockchain": blockchain_configuration(),
    }


# ============================================================
# PREPARE ANIMAL FOR BASE
# ============================================================

@router.get(
    "/animals/{animal_id}/record"
)
def prepare_animal_record(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Retrieve an existing HerdSense animal
    and generate its blockchain data hash.

    No duplicate animal database is created.
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
            status_code=404,
            detail="Animal not found",
        )

    data_hash = get_animal_data_hash(
        animal
    )

    return {
        "blockchain": "Base",
        "network": blockchain_configuration()[
            "network"
        ],
        "animal": {
            "id": animal.id,
            "tag_id": animal.tag_id,
            "name": animal.name,
            "species": animal.species,
            "farm_id": animal.farm_id,
        },
        "data_hash": data_hash,
        "message": (
            "Animal data prepared for "
            "Base registration."
        ),
    }