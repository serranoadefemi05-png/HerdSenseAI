from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password


EMAIL = "farmer@herdsense.ai"
PASSWORD = "herdsense2026"


db = SessionLocal()

try:
    print("\n=== HERDSENSE AI LOGIN DIAGNOSTIC ===\n")

    user = db.query(User).filter(User.email == EMAIL).first()

    if not user:
        print("❌ USER NOT FOUND")
        print(f"Email searched: {EMAIL}")
    else:
        print("✅ USER FOUND")
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Name: {user.full_name}")
        print(f"Role: {user.role}")
        print(
            f"Password hash exists: "
            f"{bool(user.hashed_password)}"
        )

        if not user.hashed_password:
            print("❌ User has no password hash.")
        else:
            password_valid = verify_password(
                PASSWORD,
                user.hashed_password
            )

            if password_valid:
                print("✅ PASSWORD IS CORRECT")
            else:
                print("❌ PASSWORD DOES NOT MATCH")

finally:
    db.close()

print("\n=== DIAGNOSTIC COMPLETE ===\n")