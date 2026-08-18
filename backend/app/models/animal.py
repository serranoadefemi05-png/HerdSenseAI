from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Animal(Base):
    __tablename__ = "animals"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    tag_id = Column(
        String,
        unique=True,
        nullable=False
    )

    name = Column(
        String,
        nullable=False
    )

    species = Column(
        String,
        nullable=False
    )

    breed = Column(
        String,
        nullable=True
    )

    gender = Column(
        String,
        nullable=False
    )

    age = Column(
        Integer,
        nullable=True
    )

    weight = Column(
        Float,
        nullable=True
    )

    health_status = Column(
        String,
        default="Healthy",
        nullable=False
    )

    temperature = Column(
        Float,
        default=38.5,
        nullable=False
    )

    latitude = Column(
        Float,
        nullable=True
    )

    longitude = Column(
        Float,
        nullable=True
    )

    farm_id = Column(
        Integer,
        ForeignKey("farms.id"),
        nullable=False
    )

    farm = relationship(
        "Farm",
        back_populates="animals"
    )

    telemetry = relationship(
        "Telemetry",
        back_populates="animal",
        cascade="all, delete-orphan"
    )
    alerts = relationship(
    "Alert",
    back_populates="animal",
    cascade="all, delete-orphan"
)