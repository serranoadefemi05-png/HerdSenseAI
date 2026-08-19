from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import settings


# =============================================================================
# PASSWORD HASHING
# =============================================================================

def hash_password(
    password: str,
) -> str:
    """
    Hash a plaintext password using bcrypt.

    bcrypt accepts a maximum of 72 bytes.
    """

    if not isinstance(
        password,
        str,
    ):
        raise TypeError(
            "Password must be a string."
        )

    password_bytes = password.encode(
        "utf-8"
    )

    if len(password_bytes) > 72:

        raise ValueError(
            "Password is too long. "
            "bcrypt passwords must not exceed 72 bytes."
        )

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(),
    )

    return hashed.decode(
        "utf-8"
    )


# =============================================================================
# PASSWORD VERIFICATION
# =============================================================================

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify a plaintext password against a bcrypt hash.
    """

    if not isinstance(
        plain_password,
        str,
    ):
        return False

    if not isinstance(
        hashed_password,
        str,
    ):
        return False

    password_bytes = plain_password.encode(
        "utf-8"
    )

    hashed_bytes = hashed_password.encode(
        "utf-8"
    )

    if len(password_bytes) > 72:
        return False

    try:

        return bcrypt.checkpw(
            password_bytes,
            hashed_bytes,
        )

    except (
        ValueError,
        TypeError,
        bcrypt.error,
    ):

        return False


# =============================================================================
# USER AUTHENTICATION
# =============================================================================

def authenticate_user(
    db,
    User,
    email: str,
    password: str,
):
    """
    Authenticate a user by email and password.

    Returns:
        User object if authentication succeeds.
        None otherwise.
    """

    normalized_email = (
        email
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

    if not user:
        return None

    if not verify_password(
        password,
        user.hashed_password,
    ):
        return None

    return user


# =============================================================================
# JWT ACCESS TOKEN
# =============================================================================

def create_access_token(
    data: dict,
) -> str:
    """
    Create a signed JWT access token.
    """

    to_encode = data.copy()

    expire = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    to_encode.update(
        {
            "exp": expire,
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return encoded_jwt