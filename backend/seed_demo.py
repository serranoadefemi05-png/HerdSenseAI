from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.database import Base, SessionLocal, engine

# =============================================================================
# MODELS
# =============================================================================

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal
from app.models.telemetry import Telemetry
from app.models.alert import Alert

# =============================================================================
# SECURITY
# =============================================================================

from app.core.security import hash_password


# =============================================================================
# DEMO CONFIGURATION
# =============================================================================

DEMO_EMAIL = "demo@herdsense.ai"
DEMO_PASSWORD = "Demo@123456"
DEMO_FULL_NAME = "HerdSense Demo Farmer"

FARM_NAME = "Green Valley Livestock Farm"


# =============================================================================
# DEMO ANIMALS
#
# IMPORTANT:
# Animal model uses:
#
#     gender
#
# NOT:
#
#     sex
# =============================================================================

DEMO_ANIMALS = [
    {
        "tag_id": "HS-001",
        "name": "Bella",
        "species": "Cattle",
        "breed": "Holstein Friesian",
        "gender": "Female",
        "age": 4,
        "weight": 520.0,
        "health_status": "Healthy",
        "temperature": 38.4,
        "latitude": 6.5244,
        "longitude": 3.3792,
    },
    {
        "tag_id": "HS-002",
        "name": "Max",
        "species": "Cattle",
        "breed": "White Fulani",
        "gender": "Male",
        "age": 5,
        "weight": 610.0,
        "health_status": "Healthy",
        "temperature": 38.6,
        "latitude": 6.5251,
        "longitude": 3.3801,
    },
    {
        "tag_id": "HS-003",
        "name": "Zara",
        "species": "Cattle",
        "breed": "N'Dama",
        "gender": "Female",
        "age": 3,
        "weight": 470.0,
        "health_status": "At Risk",
        "temperature": 39.2,
        "latitude": 6.5238,
        "longitude": 3.3786,
    },
    {
        "tag_id": "HS-004",
        "name": "Bruno",
        "species": "Cattle",
        "breed": "Sokoto Gudali",
        "gender": "Male",
        "age": 6,
        "weight": 680.0,
        "health_status": "Healthy",
        "temperature": 38.5,
        "latitude": 6.5260,
        "longitude": 3.3810,
    },
    {
        "tag_id": "HS-005",
        "name": "Luna",
        "species": "Cattle",
        "breed": "Muturu",
        "gender": "Female",
        "age": 2,
        "weight": 390.0,
        "health_status": "Monitoring",
        "temperature": 38.9,
        "latitude": 6.5229,
        "longitude": 3.3779,
    },
    {
        "tag_id": "HS-006",
        "name": "Kito",
        "species": "Cattle",
        "breed": "White Fulani",
        "gender": "Male",
        "age": 4,
        "weight": 560.0,
        "health_status": "Healthy",
        "temperature": 38.3,
        "latitude": 6.5248,
        "longitude": 3.3798,
    },
]


# =============================================================================
# DEMO TELEMETRY
# =============================================================================

DEMO_TELEMETRY = {
    "HS-001": {
        "temperature": 38.4,
        "latitude": 6.5244,
        "longitude": 3.3792,
        "activity": 82.0,
        "heart_rate": 68.0,
    },
    "HS-002": {
        "temperature": 38.6,
        "latitude": 6.5251,
        "longitude": 3.3801,
        "activity": 76.0,
        "heart_rate": 72.0,
    },
    "HS-003": {
        "temperature": 39.2,
        "latitude": 6.5238,
        "longitude": 3.3786,
        "activity": 48.0,
        "heart_rate": 88.0,
    },
    "HS-004": {
        "temperature": 38.5,
        "latitude": 6.5260,
        "longitude": 3.3810,
        "activity": 79.0,
        "heart_rate": 70.0,
    },
    "HS-005": {
        "temperature": 38.9,
        "latitude": 6.5229,
        "longitude": 3.3779,
        "activity": 57.0,
        "heart_rate": 81.0,
    },
    "HS-006": {
        "temperature": 38.3,
        "latitude": 6.5248,
        "longitude": 3.3798,
        "activity": 85.0,
        "heart_rate": 66.0,
    },
}


# =============================================================================
# DEMO ALERTS
#
# IMPORTANT:
# alert_type is REQUIRED by the database.
# =============================================================================

DEMO_ALERTS = [
    {
        "animal_tag": "HS-003",
        "alert_type": "temperature",
        "severity": "critical",
        "message": (
            "Zara has recorded an elevated temperature "
            "of 39.2°C."
        ),
        "resolved": False,
    },
    {
        "animal_tag": "HS-002",
        "alert_type": "temperature",
        "severity": "warning",
        "message": (
            "Max temperature is slightly above the "
            "normal monitoring range."
        ),
        "resolved": False,
    },
    {
        "animal_tag": "HS-005",
        "alert_type": "health",
        "severity": "warning",
        "message": (
            "Luna requires additional health monitoring."
        ),
        "resolved": False,
    },
    {
        "animal_tag": "HS-001",
        "alert_type": "telemetry",
        "severity": "info",
        "message": (
            "Bella telemetry connection restored."
        ),
        "resolved": True,
    },
]


# =============================================================================
# DATABASE INITIALIZATION
# =============================================================================

def initialize_database():
    print("Creating missing database tables...")

    Base.metadata.create_all(
        bind=engine
    )

    print("Database tables ready.")


# =============================================================================
# CREATE DEMO USER
# =============================================================================

def create_demo_user(
    db: Session,
) -> User:

    print()
    print("Creating demo user...")

    user = (
        db.query(User)
        .filter(
            User.email == DEMO_EMAIL
        )
        .first()
    )

    if user:

        print(
            f"Demo user already exists: "
            f"{DEMO_EMAIL}"
        )

        return user

    user = User(
        email=DEMO_EMAIL,
        full_name=DEMO_FULL_NAME,
        hashed_password=hash_password(
            DEMO_PASSWORD
        ),
        role="farmer",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print(
        f"Created demo user: "
        f"{DEMO_EMAIL}"
    )

    return user


# =============================================================================
# CREATE DEMO FARM
# =============================================================================

def create_demo_farm(
    db: Session,
    user: User,
) -> Farm:

    print()
    print("Creating demo farm...")

    farm = (
        db.query(Farm)
        .filter(
            Farm.name == FARM_NAME
        )
        .first()
    )

    if farm:

        print(
            f"Demo farm already exists: "
            f"{FARM_NAME}"
        )

        return farm

    farm = Farm(
        name=FARM_NAME,
        owner_id=user.id,
    )

    db.add(farm)
    db.commit()
    db.refresh(farm)

    print(
        f"Created demo farm: "
        f"{FARM_NAME}"
    )

    return farm


# =============================================================================
# CREATE DEMO ANIMALS
# =============================================================================

def create_demo_animals(
    db: Session,
    farm: Farm,
):

    print()
    print("Creating demo animals...")

    animals = []

    for data in DEMO_ANIMALS:

        existing = (
            db.query(Animal)
            .filter(
                Animal.tag_id == data["tag_id"]
            )
            .first()
        )

        if existing:

            print(
                f"Animal already exists: "
                f"{data['tag_id']} — "
                f"{data['name']}"
            )

            animals.append(existing)

            continue

        animal = Animal(
            tag_id=data["tag_id"],
            name=data["name"],
            species=data["species"],
            breed=data["breed"],
            gender=data["gender"],
            age=data["age"],
            weight=data["weight"],
            health_status=data["health_status"],
            temperature=data["temperature"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            farm_id=farm.id,
        )

        db.add(animal)

        db.commit()

        db.refresh(animal)

        animals.append(animal)

        print(
            f"Created animal: "
            f"{data['tag_id']} — "
            f"{data['name']}"
        )

    return animals


# =============================================================================
# CREATE DEMO TELEMETRY
# =============================================================================

def create_demo_telemetry(
    db: Session,
    animals,
):

    print()
    print("Creating demo telemetry...")

    now = datetime.now(
        timezone.utc
    )

    for animal in animals:

        telemetry_data = DEMO_TELEMETRY.get(
            animal.tag_id
        )

        if not telemetry_data:

            print(
                f"No telemetry configuration "
                f"for {animal.name}"
            )

            continue

        existing = (
            db.query(Telemetry)
            .filter(
                Telemetry.animal_id == animal.id
            )
            .first()
        )

        if existing:

            print(
                f"Telemetry already exists "
                f"for {animal.name}"
            )

            continue

        telemetry = Telemetry(
            animal_id=animal.id,
            temperature=telemetry_data["temperature"],
            latitude=telemetry_data["latitude"],
            longitude=telemetry_data["longitude"],
            timestamp=now,
        )

        # Add optional fields only when they exist
        # on the current Telemetry model.
        if hasattr(
            Telemetry,
            "activity",
        ):
            telemetry.activity = (
                telemetry_data["activity"]
            )

        if hasattr(
            Telemetry,
            "heart_rate",
        ):
            telemetry.heart_rate = (
                telemetry_data["heart_rate"]
            )

        db.add(telemetry)

        db.commit()

        db.refresh(telemetry)

        print(
            f"Created telemetry for "
            f"{animal.name}"
        )


# =============================================================================
# CREATE DEMO ALERTS
# =============================================================================

def create_demo_alerts(
    db: Session,
    animals,
):

    print()
    print("Creating demo alerts...")

    animal_map = {
        animal.tag_id: animal
        for animal in animals
    }

    created = 0
    skipped = 0

    for data in DEMO_ALERTS:

        animal = animal_map.get(
            data["animal_tag"]
        )

        if not animal:

            print(
                f"Skipping alert: "
                f"animal {data['animal_tag']} "
                f"not found."
            )

            skipped += 1

            continue

        existing = (
            db.query(Alert)
            .filter(
                Alert.animal_id == animal.id,
                Alert.alert_type
                == data["alert_type"],
                Alert.message
                == data["message"],
            )
            .first()
        )

        if existing:

            print(
                f"Alert already exists for "
                f"{animal.name}: "
                f"{data['message']}"
            )

            skipped += 1

            continue

        alert = Alert(
            animal_id=animal.id,
            alert_type=data["alert_type"],
            severity=data["severity"],
            message=data["message"],
            resolved=data.get(
                "resolved",
                False,
            ),
            timestamp=datetime.now(
                timezone.utc
            ),
        )

        db.add(alert)

        try:

            db.commit()

            db.refresh(alert)

            created += 1

            print(
                f"Created alert: "
                f"{animal.name} — "
                f"{data['alert_type']} — "
                f"{data['severity']}"
            )

        except Exception:

            db.rollback()

            raise

    print()
    print(
        f"Alerts complete: "
        f"{created} created, "
        f"{skipped} skipped."
    )


# =============================================================================
# MAIN
# =============================================================================

def main():

    print()
    print(
        "=============================================="
    )
    print(
        "HERDSENSE AI — DEMO DATABASE SEED"
    )
    print(
        "=============================================="
    )

    db = SessionLocal()

    try:

        # ---------------------------------------------------------------------
        # DATABASE
        # ---------------------------------------------------------------------

        initialize_database()

        # ---------------------------------------------------------------------
        # USER
        # ---------------------------------------------------------------------

        user = create_demo_user(
            db
        )

        # ---------------------------------------------------------------------
        # FARM
        # ---------------------------------------------------------------------

        farm = create_demo_farm(
            db,
            user,
        )

        # ---------------------------------------------------------------------
        # ANIMALS
        # ---------------------------------------------------------------------

        animals = create_demo_animals(
            db,
            farm,
        )

        # ---------------------------------------------------------------------
        # TELEMETRY
        # ---------------------------------------------------------------------

        create_demo_telemetry(
            db,
            animals,
        )

        # ---------------------------------------------------------------------
        # ALERTS
        # ---------------------------------------------------------------------

        create_demo_alerts(
            db,
            animals,
        )

        # ---------------------------------------------------------------------
        # SUCCESS
        # ---------------------------------------------------------------------

        print()
        print(
            "=============================================="
        )
        print(
            "DEMO SEED COMPLETED SUCCESSFULLY"
        )
        print(
            "=============================================="
        )

        print()
        print(
            "Demo login:"
        )
        print(
            f"Email:    {DEMO_EMAIL}"
        )
        print(
            f"Password: {DEMO_PASSWORD}"
        )

        print()
        print(
            f"Farm:     {FARM_NAME}"
        )

        print()
        print(
            f"Animals:  {len(animals)}"
        )

        print()
        print(
            "Demo animals:"
        )

        for animal in animals:

            print(
                f"  {animal.tag_id} — "
                f"{animal.name} — "
                f"{animal.species} — "
                f"{animal.health_status}"
            )

    except Exception as exc:

        db.rollback()

        print()
        print(
            "=============================================="
        )
        print(
            "DEMO SEED FAILED"
        )
        print(
            "=============================================="
        )

        print(
            repr(exc)
        )

        raise

    finally:

        db.close()


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    main()