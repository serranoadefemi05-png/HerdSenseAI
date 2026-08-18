from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# TELEMETRY CREATE
# ============================================================

class TelemetryCreate(BaseModel):
    animal_id: int

    latitude: float | None = None
    longitude: float | None = None

    temperature: float | None = Field(
        default=None,
        ge=20,
        le=50,
    )

    heart_rate: int | None = Field(
        default=None,
        ge=0,
        le=300,
    )

    activity: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )

    battery: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )


# ============================================================
# TELEMETRY RESPONSE
# ============================================================

class TelemetryResponse(BaseModel):
    id: int

    animal_id: int

    latitude: float | None = None
    longitude: float | None = None

    temperature: float | None = None
    heart_rate: int | None = None
    activity: int | None = None
    battery: int | None = None

    timestamp: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )