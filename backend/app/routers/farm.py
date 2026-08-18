from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.farm import Farm
from app.models.user import User

from app.schemas.farm import (
    FarmCreate,
    FarmResponse
)

from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/api/v1/farms",
    tags=["Farms"]
)


@router.post("/", response_model=FarmResponse)
def create_farm(
    farm: FarmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    new_farm = Farm(
        name=farm.name,
        location=farm.location,
        latitude=farm.latitude,
        longitude=farm.longitude,
        owner_id=current_user.id
    )

    db.add(new_farm)
    db.commit()
    db.refresh(new_farm)

    return new_farm


@router.get("/", response_model=list[FarmResponse])
def get_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    farms = db.query(Farm).filter(
        Farm.owner_id == current_user.id
    ).all()

    return farms


@router.get("/{farm_id}", response_model=FarmResponse)
def get_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    farm = db.query(Farm).filter(
        Farm.id == farm_id,
        Farm.owner_id == current_user.id
    ).first()

    if not farm:
        raise HTTPException(
            status_code=404,
            detail="Farm not found"
        )

    return farm


@router.delete("/{farm_id}")
def delete_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    farm = db.query(Farm).filter(
        Farm.id == farm_id,
        Farm.owner_id == current_user.id
    ).first()

    if not farm:
        raise HTTPException(
            status_code=404,
            detail="Farm not found"
        )

    db.delete(farm)
    db.commit()

    return {
        "message": "Farm deleted successfully"
    }