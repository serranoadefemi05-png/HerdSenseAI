from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password, verify_password


EMAIL = "demo@herdsense.ai"
NEW_PASSWORD = "Demo@123456"


def main():

    db = SessionLocal()

    try:

        print()
        print("==============================================")
        print("HERDSENSE AI — RESET DEMO PASSWORD")
        print("==============================================")

        # ---------------------------------------------------------
        # FIND DEMO USER
        # ---------------------------------------------------------

        user = (
            db.query(User)
            .filter(
                User.email == EMAIL
            )
            .first()
        )

        if not user:

            print()
            print("❌ Demo user does not exist.")
            print()
            print(f"Expected user: {EMAIL}")
            print()

            return

        print()
        print("✅ Demo user found")

        print(f"User ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")

        # ---------------------------------------------------------
        # RESET PASSWORD
        # ---------------------------------------------------------

        print()
        print("🔐 Resetting password...")

        user.hashed_password = hash_password(
            NEW_PASSWORD
        )

        db.add(user)

        db.commit()

        db.refresh(user)

        print("✅ Password hash updated.")

        # ---------------------------------------------------------
        # VERIFY NEW PASSWORD
        # ---------------------------------------------------------

        print()
        print("🔎 Verifying new password...")

        password_valid = verify_password(
            NEW_PASSWORD,
            user.hashed_password
        )

        print()

        if not password_valid:

            print("❌ PASSWORD VERIFICATION FAILED.")

            db.rollback()

            return

        print("✅ PASSWORD VERIFICATION SUCCESSFUL.")

        # ---------------------------------------------------------
        # FINAL RESULT
        # ---------------------------------------------------------

        print()
        print("==============================================")
        print("DEMO LOGIN CREDENTIALS")
        print("==============================================")
        print()
        print(f"Email:    {EMAIL}")
        print(f"Password: {NEW_PASSWORD}")
        print(f"Role:     {user.role}")
        print()
        print("✅ DEMO LOGIN IS READY")
        print("==============================================")
        print()

    except Exception as exc:

        db.rollback()

        print()
        print("==============================================")
        print("❌ PASSWORD RESET FAILED")
        print("==============================================")
        print()
        print(repr(exc))
        print()

        raise

    finally:

        db.close()


if __name__ == "__main__":
    main()