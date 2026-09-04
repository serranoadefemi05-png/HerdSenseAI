from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.admin import get_current_admin
from app.core.config import settings
from app.core.security import hash_password
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
# RESPONSE SCHEMAS
# =============================================================================


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    email_verified: bool
    wallet_address: Optional[str] = None
    wallet_chain: Optional[str] = None
    wallet_connected_at: Optional[datetime] = None


class AdminFarmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_id: int


class AdminAnimalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tag_id: str
    name: str
    species: str
    breed: Optional[str] = None
    gender: str
    age: Optional[int] = None
    weight: Optional[float] = None
    health_status: str
    temperature: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    farm_id: int


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================


class UserUpdateRequest(BaseModel):
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    role: Optional[str] = Field(default=None, min_length=1, max_length=50)
    email_verified: Optional[bool] = None
    wallet_address: Optional[str] = Field(default=None, max_length=255)
    wallet_chain: Optional[str] = Field(default=None, max_length=100)


class UserCreateRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="farmer", min_length=1, max_length=50)
    email_verified: bool = False
    wallet_address: Optional[str] = Field(default=None, max_length=255)
    wallet_chain: Optional[str] = Field(default=None, max_length=100)


class FarmCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location: str = Field(min_length=1, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_id: int


class FarmUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    location: Optional[str] = Field(default=None, min_length=1, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_id: Optional[int] = None


class AnimalCreateRequest(BaseModel):
    tag_id: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    species: str = Field(min_length=1, max_length=100)
    breed: Optional[str] = Field(default=None, max_length=255)
    gender: str = Field(min_length=1, max_length=50)
    age: Optional[int] = Field(default=None, ge=0)
    weight: Optional[float] = Field(default=None, ge=0)
    health_status: str = Field(default="Healthy", min_length=1, max_length=100)
    temperature: float = 38.5
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    farm_id: int


class AnimalUpdateRequest(BaseModel):
    tag_id: Optional[str] = Field(default=None, min_length=1, max_length=255)
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    species: Optional[str] = Field(default=None, min_length=1, max_length=100)
    breed: Optional[str] = Field(default=None, max_length=255)
    gender: Optional[str] = Field(default=None, min_length=1, max_length=50)
    age: Optional[int] = Field(default=None, ge=0)
    weight: Optional[float] = Field(default=None, ge=0)
    health_status: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    temperature: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    farm_id: Optional[int] = None


# =============================================================================
# HELPERS
# =============================================================================


def validate_role(role: str) -> str:
    normalized = role.strip().lower()

    allowed_roles = {
        "admin",
        "farmer",
    }

    if normalized not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Allowed roles: admin, farmer.",
        )

    return normalized


def get_user_or_404(
    db: Session,
    user_id: int,
) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


def get_farm_or_404(
    db: Session,
    farm_id: int,
) -> Farm:
    farm = (
        db.query(Farm)
        .filter(Farm.id == farm_id)
        .first()
    )

    if not farm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found.",
        )

    return farm


def get_animal_or_404(
    db: Session,
    animal_id: int,
) -> Animal:
    animal = (
        db.query(Animal)
        .filter(Animal.id == animal_id)
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found.",
        )

    return animal


def ensure_farm_owner(
    db: Session,
    owner_id: int,
) -> User:
    owner = get_user_or_404(db, owner_id)

    if owner.role != "farmer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A farm must be assigned to a farmer account.",
        )

    return owner


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
    """

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

    total_farms = (
        db.query(func.count(Farm.id))
        .scalar()
        or 0
    )

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

    animals_at_risk = (
        db.query(func.count(Animal.id))
        .filter(
            func.lower(Animal.health_status) != "healthy"
        )
        .scalar()
        or 0
    )

    total_telemetry = (
        db.query(func.count(Telemetry.id))
        .scalar()
        or 0
    )

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

    database_status = "healthy"

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "unhealthy"

    return {
        "status": "success",
        "generated_at": datetime.now(timezone.utc).isoformat(),

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


# =============================================================================
# USER / ACCOUNT MANAGEMENT
# =============================================================================


@router.get(
    "/users",
    response_model=list[AdminUserResponse],
)
def list_users(
    search: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    verified: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    List platform accounts for administrative management.
    """

    query = db.query(User)

    if search:
        search_term = f"%{search.strip()}%"

        query = query.filter(
            (
                User.email.ilike(search_term)
                | User.full_name.ilike(search_term)
            )
        )

    if role:
        query = query.filter(
            User.role == validate_role(role)
        )

    if verified is not None:
        query = query.filter(
            User.email_verified == verified
        )

    return (
        query
        .order_by(User.id.desc())
        .all()
    )


@router.get(
    "/users/{user_id}",
    response_model=AdminUserResponse,
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Return one platform account.
    """

    return get_user_or_404(
        db,
        user_id,
    )


@router.post(
    "/users",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Create a platform account from the admin control center.
    """

    role = validate_role(payload.role)

    email = payload.email.strip().lower()
    full_name = payload.full_name.strip()

    existing_user = (
        db.query(User)
        .filter(
            func.lower(User.email) == email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    if payload.wallet_address:
        existing_wallet = (
            db.query(User)
            .filter(
                User.wallet_address == payload.wallet_address.strip()
            )
            .first()
        )

        if existing_wallet:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This wallet address is already linked to another account.",
            )

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(payload.password),
        role=role,
        email_verified=payload.email_verified,
        wallet_address=(
            payload.wallet_address.strip()
            if payload.wallet_address
            else None
        ),
        wallet_chain=(
            payload.wallet_chain.strip()
            if payload.wallet_chain
            else None
        ),
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create account because a unique field already exists.",
        )

    return user


@router.put(
    "/users/{user_id}",
    response_model=AdminUserResponse,
)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Correct or update a platform account.
    """

    user = get_user_or_404(
        db,
        user_id,
    )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if "email" in update_data:
        email = update_data["email"].strip().lower()

        existing_user = (
            db.query(User)
            .filter(
                func.lower(User.email) == email,
                User.id != user.id,
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another account already uses this email.",
            )

        update_data["email"] = email

    if "full_name" in update_data:
        update_data["full_name"] = update_data["full_name"].strip()

    if "role" in update_data:
        new_role = validate_role(update_data["role"])

        # Prevent the administrator from accidentally removing
        # the final administrator account.
        if (
            user.role == "admin"
            and new_role != "admin"
        ):
            admin_count = (
                db.query(func.count(User.id))
                .filter(User.role == "admin")
                .scalar()
                or 0
            )

            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The final administrator account cannot be demoted.",
                )

        update_data["role"] = new_role

    if "wallet_address" in update_data:
        wallet = update_data["wallet_address"]

        if wallet:
            wallet = wallet.strip()

            existing_wallet = (
                db.query(User)
                .filter(
                    User.wallet_address == wallet,
                    User.id != user.id,
                )
                .first()
            )

            if existing_wallet:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This wallet address is already linked to another account.",
                )

            update_data["wallet_address"] = wallet

    for field, value in update_data.items():
        setattr(
            user,
            field,
            value,
        )

    db.commit()
    db.refresh(user)

    return user


@router.delete(
    "/users/{user_id}",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Delete a platform account.

    Farm and animal relationships use SQLAlchemy cascade rules,
    so owned farms and their animals are removed with the account.
    """

    user = get_user_or_404(
        db,
        user_id,
    )

    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete the administrator account currently in use.",
        )

    if user.role == "admin":
        admin_count = (
            db.query(func.count(User.id))
            .filter(User.role == "admin")
            .scalar()
            or 0
        )

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The final administrator account cannot be deleted.",
            )

    deleted_user_id = user.id

    db.delete(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The account could not be deleted because related records prevent deletion.",
        )

    return {
        "status": "success",
        "message": "Account deleted successfully.",
        "deleted_user_id": deleted_user_id,
    }


# =============================================================================
# FARM MANAGEMENT
# =============================================================================


@router.get(
    "/farms",
    response_model=list[AdminFarmResponse],
)
def list_farms(
    search: Optional[str] = Query(default=None),
    owner_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    List all farms.
    """

    query = db.query(Farm)

    if search:
        search_term = f"%{search.strip()}%"

        query = query.filter(
            (
                Farm.name.ilike(search_term)
                | Farm.location.ilike(search_term)
            )
        )

    if owner_id is not None:
        query = query.filter(
            Farm.owner_id == owner_id
        )

    return (
        query
        .order_by(Farm.id.desc())
        .all()
    )


@router.get(
    "/farms/{farm_id}",
    response_model=AdminFarmResponse,
)
def get_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Return one farm.
    """

    return get_farm_or_404(
        db,
        farm_id,
    )


@router.post(
    "/farms",
    response_model=AdminFarmResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_farm(
    payload: FarmCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Create a farm and assign it to a farmer.
    """

    ensure_farm_owner(
        db,
        payload.owner_id,
    )

    farm = Farm(
        name=payload.name.strip(),
        location=payload.location.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        owner_id=payload.owner_id,
    )

    db.add(farm)
    db.commit()
    db.refresh(farm)

    return farm


@router.put(
    "/farms/{farm_id}",
    response_model=AdminFarmResponse,
)
def update_farm(
    farm_id: int,
    payload: FarmUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Correct farm information or reassign ownership.
    """

    farm = get_farm_or_404(
        db,
        farm_id,
    )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if "name" in update_data:
        update_data["name"] = update_data["name"].strip()

    if "location" in update_data:
        update_data["location"] = update_data["location"].strip()

    if "owner_id" in update_data:
        ensure_farm_owner(
            db,
            update_data["owner_id"],
        )

    for field, value in update_data.items():
        setattr(
            farm,
            field,
            value,
        )

    db.commit()
    db.refresh(farm)

    return farm


@router.delete(
    "/farms/{farm_id}",
)
def delete_farm(
    farm_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Delete a farm.

    Existing SQLAlchemy cascade configuration removes
    the farm's animals and their dependent relationships.
    """

    farm = get_farm_or_404(
        db,
        farm_id,
    )

    deleted_farm_id = farm.id

    db.delete(farm)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The farm could not be deleted because related records prevent deletion.",
        )

    return {
        "status": "success",
        "message": "Farm deleted successfully.",
        "deleted_farm_id": deleted_farm_id,
    }


# =============================================================================
# ANIMAL MANAGEMENT
# =============================================================================


@router.get(
    "/animals",
    response_model=list[AdminAnimalResponse],
)
def list_animals(
    search: Optional[str] = Query(default=None),
    farm_id: Optional[int] = Query(default=None),
    health_status: Optional[str] = Query(default=None),
    species: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    List all animals for administrative management.
    """

    query = db.query(Animal)

    if search:
        search_term = f"%{search.strip()}%"

        query = query.filter(
            (
                Animal.name.ilike(search_term)
                | Animal.tag_id.ilike(search_term)
                | Animal.species.ilike(search_term)
            )
        )

    if farm_id is not None:
        query = query.filter(
            Animal.farm_id == farm_id
        )

    if health_status:
        query = query.filter(
            func.lower(Animal.health_status)
            == health_status.strip().lower()
        )

    if species:
        query = query.filter(
            func.lower(Animal.species)
            == species.strip().lower()
        )

    return (
        query
        .order_by(Animal.id.desc())
        .all()
    )


@router.get(
    "/animals/{animal_id}",
    response_model=AdminAnimalResponse,
)
def get_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Return one animal.
    """

    return get_animal_or_404(
        db,
        animal_id,
    )


@router.post(
    "/animals",
    response_model=AdminAnimalResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_animal(
    payload: AnimalCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Register a new animal.
    """

    get_farm_or_404(
        db,
        payload.farm_id,
    )

    existing_animal = (
        db.query(Animal)
        .filter(
            Animal.tag_id == payload.tag_id.strip()
        )
        .first()
    )

    if existing_animal:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An animal with this tag ID already exists.",
        )

    animal = Animal(
        tag_id=payload.tag_id.strip(),
        name=payload.name.strip(),
        species=payload.species.strip(),
        breed=(
            payload.breed.strip()
            if payload.breed
            else None
        ),
        gender=payload.gender.strip(),
        age=payload.age,
        weight=payload.weight,
        health_status=payload.health_status.strip(),
        temperature=payload.temperature,
        latitude=payload.latitude,
        longitude=payload.longitude,
        farm_id=payload.farm_id,
    )

    db.add(animal)

    try:
        db.commit()
        db.refresh(animal)
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create animal because a unique field already exists.",
        )

    return animal


@router.put(
    "/animals/{animal_id}",
    response_model=AdminAnimalResponse,
)
def update_animal(
    animal_id: int,
    payload: AnimalUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Correct animal information or reassign the animal to another farm.
    """

    animal = get_animal_or_404(
        db,
        animal_id,
    )

    update_data = payload.model_dump(
        exclude_unset=True
    )

    if "tag_id" in update_data:
        tag_id = update_data["tag_id"].strip()

        existing_animal = (
            db.query(Animal)
            .filter(
                Animal.tag_id == tag_id,
                Animal.id != animal.id,
            )
            .first()
        )

        if existing_animal:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another animal already uses this tag ID.",
            )

        update_data["tag_id"] = tag_id

    for field in (
        "name",
        "species",
        "gender",
        "health_status",
    ):
        if field in update_data and update_data[field] is not None:
            update_data[field] = update_data[field].strip()

    if "breed" in update_data and update_data["breed"]:
        update_data["breed"] = update_data["breed"].strip()

    if "farm_id" in update_data:
        get_farm_or_404(
            db,
            update_data["farm_id"],
        )

    for field, value in update_data.items():
        setattr(
            animal,
            field,
            value,
        )

    try:
        db.commit()
        db.refresh(animal)
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to update animal because a unique field already exists.",
        )

    return animal


@router.delete(
    "/animals/{animal_id}",
)
def delete_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Remove an animal and its dependent telemetry/alert records.
    """

    animal = get_animal_or_404(
        db,
        animal_id,
    )

    deleted_animal_id = animal.id
    deleted_tag_id = animal.tag_id

    db.delete(animal)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The animal could not be deleted because related records prevent deletion.",
        )

    return {
        "status": "success",
        "message": "Animal deleted successfully.",
        "deleted_animal_id": deleted_animal_id,
        "deleted_tag_id": deleted_tag_id,
    }