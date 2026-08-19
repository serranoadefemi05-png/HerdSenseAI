from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import settings


# ============================================================================
# PASSWORD HASHING
# ============================================================================

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.

    bcrypt has a maximum input size of 72 bytes.
    We enforce that limit explicitly rather than allowing
    the underlying library to fail unexpectedly.
    """

    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError(
            "Password is too long. "
            "bcrypt passwords must not exceed 72 bytes."
        )

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    )

    return hashed.decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.
    """

    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    if len(password_bytes) > 72:
        return False

    try:
        return bcrypt.checkpw(
            password_bytes,
            hashed_bytes
        )

    except (ValueError, TypeError):
        return False


# ============================================================================
# USER AUTHENTICATION
# ============================================================================

def authenticate_user(
    db,
    User,
    email: str,
    password: str
):
    """
    Authenticate a user by email and password.

    Returns:
        User object if authentication succeeds.
        None otherwise.
    """

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        return None

    if not verify_password(
        password,
        user.hashed_password
    ):
        return None

    return user


# ============================================================================
# JWT ACCESS TOKEN
# ============================================================================

def create_access_token(
    data: dict
) -> str:
    """
    Create a signed JWT access token.
    """

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update(
        {
            "exp": expire
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt