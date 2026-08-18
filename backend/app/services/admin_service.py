from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def ensure_admin_accounts(db: Session) -> None:
    """
    Ensure the two configured permanent administrator accounts exist.

    Admin credentials come from environment variables.
    Normal registration cannot create administrator accounts.
    """

    admins = [
        {
            "email": settings.ADMIN_EMAIL.strip().lower(),
            "password": settings.ADMIN_PASSWORD,
            "full_name": "HerdSense AI Administrator",
        },
        {
            "email": settings.ADMIN_EMAIL_2.strip().lower(),
            "password": settings.ADMIN_PASSWORD_2,
            "full_name": "HerdSense AI Administrator 2",
        },
    ]

    for admin in admins:
        existing_user = (
            db.query(User)
            .filter(User.email == admin["email"])
            .first()
        )

        if existing_user:
            # Ensure configured admin accounts remain administrators.
            if existing_user.role != "admin":
                existing_user.role = "admin"

            continue

        new_admin = User(
            email=admin["email"],
            full_name=admin["full_name"],
            hashed_password=hash_password(admin["password"]),
            role="admin",
        )

        db.add(new_admin)

    db.commit()