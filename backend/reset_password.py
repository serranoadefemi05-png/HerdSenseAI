from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


EMAIL = "farmer@herdsense.ai"
NEW_PASSWORD = "herdsense2026"


db = SessionLocal()

try:
    user = db.query(User).filter(User.email == EMAIL).first()

    if not user:
        print("❌ User not found")
    else:
        user.hashed_password = hash_password(NEW_PASSWORD)

        db.commit()
        db.refresh(user)

        print("\n=== PASSWORD RESET ===")
        print("✅ User found")
        print(f"Email: {user.email}")
        print(f"Name: {user.full_name}")
        print("✅ Password successfully reset")
        print("Password: herdsense2026")
        print("======================\n")

finally:
    db.close()