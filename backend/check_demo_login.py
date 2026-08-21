from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password


EMAIL = "demo@herdsense.ai"
PASSWORD = "Demo@123456"


def main():

    db = SessionLocal()

    try:

        print()
        print("==============================================")
        print("HERDSENSE AI — DEMO LOGIN CHECK")
        print("==============================================")

        user = (
            db.query(User)
            .filter(
                User.email == EMAIL
            )
            .first()
        )

        # ---------------------------------------------------------
        # USER CHECK
        # ---------------------------------------------------------

        if not user:

            print()
            print("❌ DEMO USER NOT FOUND")
            print()
            print(f"Database does not contain: {EMAIL}")
            print()
            print("The seed script and API are probably")
            print("using different DATABASE_URL values.")

            return

        print()
        print("✅ DEMO USER FOUND")

        print()
        print("User ID:")
        print(user.id)

        print()
        print("Email:")
        print(user.email)

        print()
        print("Full name:")
        print(user.full_name)

        print()
        print("Role:")
        print(user.role)

        # ---------------------------------------------------------
        # PASSWORD CHECK
        # ---------------------------------------------------------

        password_valid = verify_password(
            PASSWORD,
            user.hashed_password,
        )

        print()

        if password_valid:

            print("✅ PASSWORD IS VALID")

        else:

            print("❌ PASSWORD IS INVALID")

        # ---------------------------------------------------------
        # FINAL RESULT
        # ---------------------------------------------------------

        print()
        print("==============================================")

        if password_valid:

            print("LOGIN CREDENTIALS ARE VALID")
            print()
            print(f"Email:    {EMAIL}")
            print(f"Password: {PASSWORD}")

        else:

            print("LOGIN CREDENTIALS ARE INVALID")

        print("==============================================")
        print()

    finally:

        db.close()


if __name__ == "__main__":
    main()