from app.db.database import SessionLocal
from app.models.user import User

db = SessionLocal()

users = db.query(User).all()

print("\n=== HERDSENSE AI USERS ===")

if not users:
    print("No users found.")

for user in users:
    print(
        f"ID: {user.id} | "
        f"Email: {user.email} | "
        f"Name: {user.full_name} | "
        f"Role: {user.role}"
    )

db.close()