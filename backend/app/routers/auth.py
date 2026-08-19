from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
)

from app.db.database import get_db
from app.models.user import User

from app.schemas.user import (
    UserCreate,
    UserResponse,
)

from app.schemas.token import (
    Token,
    TokenUser,
)


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# =============================================================================
# ADMIN EMAIL HELPERS
# =============================================================================

def is_configured_admin_email(
    email: str,
) -> bool:

    normalized_email = (
        email
        .strip()
        .lower()
    )

    admin_emails = {
        str(
            getattr(
                settings,
                "ADMIN_EMAIL",
                "",
            )
        )
        .strip()
        .lower(),

        str(
            getattr(
                settings,
                "ADMIN_EMAIL_2",
                "",
            )
        )
        .strip()
        .lower(),
    }

    admin_emails.discard("")

    return normalized_email in admin_emails


# =============================================================================
# REGISTER
# =============================================================================

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
    Register a normal HerdSense AI farmer account.

    Administrator accounts are provisioned from server-side environment
    variables during application startup and cannot be created through this
    public endpoint.
    """

    email = (
        str(user.email)
        .strip()
        .lower()
    )

    full_name = (
        user.full_name
        .strip()
    )

    # -------------------------------------------------------------------------
    # VALIDATION
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # PROTECT ADMIN EMAILS
    # -------------------------------------------------------------------------

    if is_configured_admin_email(email):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This email is reserved for an administrator "
                "and cannot be registered."
            ),
        )

    # -------------------------------------------------------------------------
    # EXISTING USER
    # -------------------------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # -------------------------------------------------------------------------
    # CREATE FARMER
    # -------------------------------------------------------------------------

    new_user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(
            user.password
        ),
        role="farmer",
    )

    db.add(new_user)

    try:

        db.commit()

        db.refresh(
            new_user
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create account",
        )

    return new_user


# =============================================================================
# LOGIN
# =============================================================================

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
        authenticated user
    """

    email = (
        form_data.username
        .strip()
        .lower()
    )

    # -------------------------------------------------------------------------
    # FIND USER
    # -------------------------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    # -------------------------------------------------------------------------
    # INVALID USER
    # -------------------------------------------------------------------------

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------------------------------
    # INVALID PASSWORD
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # JWT
    # -------------------------------------------------------------------------

    access_token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
        }
    )

    # -------------------------------------------------------------------------
    # AUTHENTICATED USER
    # -------------------------------------------------------------------------

    authenticated_user = TokenUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )

    # -------------------------------------------------------------------------
    # RESPONSE
    # -------------------------------------------------------------------------

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=authenticated_user,
    )