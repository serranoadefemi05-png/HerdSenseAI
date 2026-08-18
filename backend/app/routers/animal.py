from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.models.animal import Animal
from app.models.farm import Farm
from app.models.user import User

from app.schemas.animal import (
    AnimalCreate,
    AnimalResponse
)

from app.core.dependencies import get_current_user


router = APIRouter(
    prefix="/api/v1/animals",
    tags=["Animals"]
)


# ============================================================
# CREATE ANIMAL
# ============================================================

@router.post("/", response_model=AnimalResponse)
def create_animal(
    animal: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # --------------------------------------------------------
    # Check that the farm exists and belongs to current user
    # --------------------------------------------------------

    farm = (
        db.query(Farm)
        .filter(
            Farm.id == animal.farm_id,
            Farm.owner_id == current_user.id
        )
        .first()
    )

    if not farm:
        raise HTTPException(
            status_code=404,
            detail="Farm not found"
        )

    # --------------------------------------------------------
    # Check for duplicate animal tag
    # --------------------------------------------------------

    existing_animal = (
        db.query(Animal)
        .filter(
            Animal.tag_id == animal.tag_id
        )
        .first()
    )

    if existing_animal:
        raise HTTPException(
            status_code=400,
            detail=f"Animal tag '{animal.tag_id}' already exists"
        )

    # --------------------------------------------------------
    # Create animal
    # --------------------------------------------------------

    new_animal = Animal(
        tag_id=animal.tag_id,
        name=animal.name,
        species=animal.species,
        breed=animal.breed,
        gender=animal.gender,
        age=animal.age,
        weight=animal.weight,

        # Default health information
        health_status="Healthy",
        temperature=38.5,

        # GPS defaults
        latitude=0.0,
        longitude=0.0,

        # Farm relationship
        farm_id=animal.farm_id
    )

    # --------------------------------------------------------
    # Save to database
    # --------------------------------------------------------

    try:

        db.add(new_animal)

        db.commit()

        db.refresh(new_animal)

    except IntegrityError as e:

        db.rollback()

        print("DATABASE INTEGRITY ERROR:")
        print(e)

        raise HTTPException(
            status_code=400,
            detail="Database constraint error while creating animal"
        )

    except Exception as e:

        db.rollback()

        print("ANIMAL CREATION ERROR:")
        print(type(e).__name__)
        print(str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Animal creation failed: {str(e)}"
        )

    return new_animal


# ============================================================
# GET ALL ANIMALS
# ============================================================

@router.get("/", response_model=list[AnimalResponse])
def get_animals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    animals = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Farm.owner_id == current_user.id
        )
        .all()
    )

    return animals


# ============================================================
# GET SINGLE ANIMAL
# ============================================================

@router.get("/{animal_id}", response_model=AnimalResponse)
def get_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    animal = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Animal.id == animal_id,
            Farm.owner_id == current_user.id
        )
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=404,
            detail="Animal not found"
        )

    return animal


# ============================================================
# DELETE ANIMAL
# ============================================================

@router.delete("/{animal_id}")
def delete_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    animal = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Animal.id == animal_id,
            Farm.owner_id == current_user.id
        )
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=404,
            detail="Animal not found"
        )

    try:

        db.delete(animal)

        db.commit()

    except Exception as e:

        db.rollback()

        print("ANIMAL DELETE ERROR:")
        print(type(e).__name__)
        print(str(e))

        raise HTTPException(
            status_code=500,
            detail="Failed to delete animal"
        )

    return {
        "message": "Animal deleted successfully"
    }