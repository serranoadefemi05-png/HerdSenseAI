from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
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

from app.services.email_service import (
    send_verification_email,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================


class ResendVerificationRequest(BaseModel):
    """
    Request body for resending an email verification message.
    """

    email: EmailStr


# =============================================================================
# ADMIN CONFIGURATION
# =============================================================================


def get_configured_admins() -> list[tuple[str, str]]:
    """
    Return administrator credentials configured in application settings.
    """

    admins: list[tuple[str, str]] = []

    admin_email = str(
        getattr(settings, "ADMIN_EMAIL", "")
        or ""
    ).strip().lower()

    admin_password = str(
        getattr(settings, "ADMIN_PASSWORD", "")
        or ""
    )

    if admin_email and admin_password:
        admins.append(
            (
                admin_email,
                admin_password,
            )
        )

    admin_email_2 = str(
        getattr(settings, "ADMIN_EMAIL_2", "")
        or ""
    ).strip().lower()

    admin_password_2 = str(
        getattr(settings, "ADMIN_PASSWORD_2", "")
        or ""
    )

    if admin_email_2 and admin_password_2:
        admins.append(
            (
                admin_email_2,
                admin_password_2,
            )
        )

    return admins


def is_configured_admin_email(
    email: str,
) -> bool:
    """
    Check whether an email belongs to a configured administrator.
    """

    normalized_email = (
        email.strip().lower()
    )

    return any(
        normalized_email == admin_email
        for admin_email, _ in get_configured_admins()
    )


# =============================================================================
# ADMIN PROVISIONING
# =============================================================================


def provision_admin_accounts(
    db: Session,
) -> None:
    """
    Ensure configured administrator accounts exist and are correctly
    configured.
    """

    configured_admins = (
        get_configured_admins()
    )

    if not configured_admins:
        print(
            "⚠️ HerdSense AI: "
            "No administrator credentials configured."
        )
        return

    for admin_email, admin_password in configured_admins:

        try:
            existing_user = (
                db.query(User)
                .filter(
                    User.email == admin_email
                )
                .first()
            )

            # -----------------------------------------------------------------
            # CREATE ADMIN
            # -----------------------------------------------------------------

            if existing_user is None:

                admin_user = User(
                    email=admin_email,
                    full_name=(
                        "HerdSense AI Administrator"
                    ),
                    hashed_password=hash_password(
                        admin_password
                    ),
                    role="admin",
                    email_verified=True,
                )

                db.add(admin_user)
                db.commit()

                print(
                    f"✅ HerdSense AI: "
                    f"Admin account created: {admin_email}"
                )

                continue

            # -----------------------------------------------------------------
            # UPDATE EXISTING ADMIN
            # -----------------------------------------------------------------

            changed = False

            if existing_user.role != "admin":
                existing_user.role = "admin"
                changed = True

            if not existing_user.email_verified:
                existing_user.email_verified = True
                changed = True

            if not existing_user.hashed_password:

                existing_user.hashed_password = (
                    hash_password(admin_password)
                )

                changed = True

            else:

                try:

                    password_matches = verify_password(
                        admin_password,
                        existing_user.hashed_password,
                    )

                except Exception as exc:

                    print(
                        "⚠️ HerdSense AI: "
                        "Unable to verify existing administrator "
                        f"password for {admin_email}: {exc!r}"
                    )

                    password_matches = False

                if not password_matches:

                    existing_user.hashed_password = (
                        hash_password(admin_password)
                    )

                    changed = True

            if changed:

                db.commit()
                db.refresh(existing_user)

            print(
                f"✅ HerdSense AI: "
                f"Administrator verified: {admin_email}"
            )

        except Exception as exc:

            db.rollback()

            print(
                "❌ HerdSense AI admin provisioning error "
                f"for {admin_email}:",
                repr(exc),
            )


# =============================================================================
# EMAIL VERIFICATION TOKEN
# =============================================================================


def create_verification_token(
    email: str,
) -> str:
    """
    Create a signed email verification JWT valid for 24 hours.
    """

    expire = (
        datetime.now(timezone.utc)
        + timedelta(hours=24)
    )

    payload = {
        "sub": email,
        "purpose": "email_verification",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


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
    Register a new farmer account.

    New accounts remain unverified until the email verification
    link is successfully used.
    """

    email = (
        str(user.email)
        .strip()
        .lower()
    )

    full_name = (
        user.full_name.strip()
    )

    # -------------------------------------------------------------------------
    # VALIDATION
    # -------------------------------------------------------------------------

    if not full_name:

        raise HTTPException(
            status_code=400,
            detail="Full name is required.",
        )

    if len(user.password) < 8:

        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters.",
        )

    if is_configured_admin_email(email):

        raise HTTPException(
            status_code=403,
            detail=(
                "This email is reserved for an administrator "
                "and cannot be registered."
            ),
        )

    # -------------------------------------------------------------------------
    # CHECK EXISTING USER
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
            status_code=400,
            detail="Email already registered.",
        )

    # -------------------------------------------------------------------------
    # CREATE USER
    # -------------------------------------------------------------------------

    new_user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(
            user.password
        ),
        role="farmer",
        email_verified=False,
    )

    db.add(new_user)

    try:

        db.commit()
        db.refresh(new_user)

    except Exception as exc:

        db.rollback()

        print(
            "❌ HerdSense AI registration error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create account.",
        )

    # -------------------------------------------------------------------------
    # SEND VERIFICATION EMAIL
    # -------------------------------------------------------------------------

    try:

        verification_token = (
            create_verification_token(
                new_user.email
            )
        )

        # IMPORTANT:
        # Login.jsx reads ?token=...
        verification_url = (
            f"{settings.FRONTEND_URL}"
            f"/login?token={verification_token}"
        )

        send_verification_email(
            recipient=new_user.email,
            full_name=new_user.full_name,
            verification_url=verification_url,
        )

        print(
            f"📧 HerdSense AI: "
            f"Verification email sent to {new_user.email}"
        )

    except Exception as exc:

        # The account has already been created.
        # Keep it so the farmer can use the resend-verification
        # flow after the email service is fixed.
        #
        # However, registration must NOT report success when
        # the required verification email could not be delivered.

        print(
            "❌ HerdSense AI verification email error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Your account was created, but we could not send the "
                "verification email. Please try resending the verification "
                "email shortly."
            ),
        )

    return new_user


# =============================================================================
# VERIFY EMAIL
# =============================================================================


@router.get("/verify-email")
def verify_email(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Verify a user's email address using the signed verification token.
    """

    try:

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[
                settings.JWT_ALGORITHM
            ],
        )

        if payload.get("purpose") != "email_verification":

            raise HTTPException(
                status_code=400,
                detail="Invalid verification token.",
            )

        email = payload.get("sub")

        if not email:

            raise HTTPException(
                status_code=400,
                detail="Invalid verification token.",
            )

    except HTTPException:
        raise

    except JWTError:

        raise HTTPException(
            status_code=400,
            detail=(
                "Verification link is invalid or expired."
            ),
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

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User account not found.",
        )

    # -------------------------------------------------------------------------
    # MARK EMAIL VERIFIED
    # -------------------------------------------------------------------------

    if not user.email_verified:

        user.email_verified = True

        try:

            db.commit()
            db.refresh(user)

        except Exception as exc:

            db.rollback()

            print(
                "❌ HerdSense AI verification error:",
                repr(exc),
            )

            raise HTTPException(
                status_code=500,
                detail="Unable to verify account.",
            )

    return {
        "message": "Email verified successfully.",
        "email": user.email,
    }


# =============================================================================
# RESEND VERIFICATION EMAIL
# =============================================================================


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Resend an email verification link.

    The response deliberately does not reveal whether an account exists.
    """

    normalized_email = (
        str(payload.email)
        .strip()
        .lower()
    )

    user = (
        db.query(User)
        .filter(
            User.email == normalized_email
        )
        .first()
    )

    if user and not user.email_verified:

        try:

            token = create_verification_token(
                user.email
            )

            # IMPORTANT:
            # Login.jsx reads ?token=...
            verification_url = (
                f"{settings.FRONTEND_URL}"
                f"/login?token={token}"
            )

            send_verification_email(
                recipient=user.email,
                full_name=user.full_name,
                verification_url=verification_url,
            )

            print(
                f"📧 HerdSense AI: "
                f"Verification email resent to {user.email}"
            )

        except Exception as exc:

            print(
                "❌ HerdSense AI resend verification error:",
                repr(exc),
            )

    return {
        "message": (
            "If the account exists and is not verified, "
            "a new verification email has been sent."
        )
    }


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
    Authenticate a user and return a JWT access token.
    """

    email = (
        str(form_data.username)
        .strip()
        .lower()
    )

    password = form_data.password

    # -------------------------------------------------------------------------
    # BASIC VALIDATION
    # -------------------------------------------------------------------------

    if not email or not password:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
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

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # -------------------------------------------------------------------------
    # PASSWORD VERIFICATION
    # -------------------------------------------------------------------------

    try:

        password_valid = verify_password(
            password,
            user.hashed_password,
        )

    except ValueError as exc:

        print(
            "❌ HerdSense AI password verification error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Password verification service is temporarily unavailable."
            ),
        )

    except Exception as exc:

        print(
            "❌ HerdSense AI authentication error:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Authentication service error.",
        )

    if not password_valid:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    # =========================================================================
    # ADMIN PROTECTION
    # =========================================================================

    if is_configured_admin_email(email):

        changed = False

        if user.role != "admin":

            user.role = "admin"
            changed = True

        if not user.email_verified:

            user.email_verified = True
            changed = True

        if changed:

            try:

                db.commit()
                db.refresh(user)

            except Exception as exc:

                db.rollback()

                print(
                    "❌ HerdSense AI administrator validation error:",
                    repr(exc),
                )

                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Unable to validate administrator account."
                    ),
                )

    # =========================================================================
    # EMAIL VERIFICATION CHECK
    # =========================================================================

    if not user.email_verified:

        raise HTTPException(
            status_code=403,
            detail=(
                "Please verify your email address before signing in. "
                "Check your email inbox."
            ),
        )

    # =========================================================================
    # CREATE JWT
    # =========================================================================

    access_token = create_access_token(
        {
            "sub": user.email,
            "role": user.role,
        }
    )

    # =========================================================================
    # TOKEN USER
    # =========================================================================

    authenticated_user = TokenUser(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_email_verified=user.email_verified,
    )

    # =========================================================================
    # RESPONSE
    # =========================================================================

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=authenticated_user,
    )