from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token, TokenUser

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# ============================================================================
# REGISTER
# ============================================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new HerdSense AI user.

    Passwords are hashed before persistence.
    Raw passwords are never stored.
    """

    email = str(user.email).strip().lower()
    full_name = user.full_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required",
        )

    if len(user.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(user.password),
        role="farmer",
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create account",
        )

    return new_user


# ============================================================================
# LOGIN
# ============================================================================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authenticate a HerdSense AI user.

    OAuth2PasswordRequestForm expects:

        username = user's email
        password = user's password

    Returns:

        access_token
        token_type
        authenticated user profile
    """

    email = form_data.username.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    # ------------------------------------------------------------------------
    # INVALID USER
    # ------------------------------------------------------------------------

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # ------------------------------------------------------------------------
    # INVALID PASSWORD
    # ------------------------------------------------------------------------

    if not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # ------------------------------------------------------------------------
    # JWT
    # ------------------------------------------------------------------------

    access_token = create_access_token(
        {
            "sub": user.email,
        }
    )

    # ------------------------------------------------------------------------
    # AUTHENTICATED USER
    # ------------------------------------------------------------------------

    authenticated_user = TokenUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )

    # ------------------------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------------------------

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=authenticated_user,
    )