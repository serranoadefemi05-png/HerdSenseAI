from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.database import get_db
from app.models.user import User
from app.services.email_service import send_password_reset_email


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Password Reset"],
)


# =============================================================================
# TOKEN HELPERS
# =============================================================================


def create_password_reset_token(
    email: str,
) -> str:

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=30
    )

    payload = {
        "sub": email,
        "purpose": "password_reset",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_password_reset_token(
    token: str,
) -> str:

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[
                settings.ALGORITHM
            ],
        )

        if payload.get("purpose") != "password_reset":

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token.",
            )

        email = payload.get("sub")

        if not email:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token.",
            )

        return email

    except JWTError:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or expired.",
        )


# =============================================================================
# REQUEST PASSWORD RESET
# =============================================================================


@router.post("/forgot-password")
def forgot_password(
    email: str,
    db: Session = Depends(get_db),
):
    normalized_email = (
        email.strip().lower()
    )

    user = (
        db.query(User)
        .filter(
            User.email == normalized_email
        )
        .first()
    )

    # IMPORTANT:
    # Never reveal whether an email exists.
    if user:

        token = create_password_reset_token(
            user.email
        )

        reset_url = (
            f"{settings.FRONTEND_URL}"
            f"/login?reset_token={token}"
        )

        try:

            send_password_reset_email(
                recipient=user.email,
                full_name=user.full_name,
                reset_url=reset_url,
            )

        except Exception as exc:

            print(
                "❌ HerdSense AI password reset email error:",
                repr(exc),
            )

    return {
        "message": (
            "If an account exists for this email, "
            "a password reset link has been sent."
        )
    }


# =============================================================================
# RESET PASSWORD
# =============================================================================


@router.post("/reset-password")
def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db),
):

    if len(new_password) < 8:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters.",
        )

    email = decode_password_reset_token(
        token
    )

    user = (
        db.query(User)
        .filter(
            User.email == email
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to reset password.",
        )

    user.hashed_password = hash_password(
        new_password
    )

    try:

        db.commit()

    except Exception as exc:

        db.rollback()

        print(
            "❌ HerdSense AI password reset error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password.",
        )

    return {
        "message": "Password reset successfully."
    }