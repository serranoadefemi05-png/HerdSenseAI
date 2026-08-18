from datetime import datetime

from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.db.database import Base


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    animal_id = Column(
        Integer,
        ForeignKey("animals.id"),
        nullable=False,
    )

    # ============================================================
    # LOCATION
    # ============================================================

    latitude = Column(
        Float,
        nullable=True,
    )

    longitude = Column(
        Float,
        nullable=True,
    )

    # ============================================================
    # HEALTH / SENSOR DATA
    # ============================================================

    temperature = Column(
        Float,
        nullable=True,
    )

    heart_rate = Column(
        Integer,
        nullable=True,
    )

    activity = Column(
        Integer,
        nullable=True,
    )

    battery = Column(
        Integer,
        nullable=True,
    )

    # ============================================================
    # TIMESTAMP
    # ============================================================

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # ============================================================
    # RELATIONSHIP WITH ANIMAL
    # ============================================================

    animal = relationship(
        "Animal",
        back_populates="telemetry",
    )