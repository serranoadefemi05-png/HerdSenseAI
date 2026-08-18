from pydantic import BaseModel


# -----------------------------
# Request Schema
# -----------------------------
class FarmCreate(BaseModel):
    name: str
    location: str
    latitude: float
    longitude: float


# -----------------------------
# Response Schema
# -----------------------------
class FarmResponse(BaseModel):
    id: int
    name: str
    location: str
    latitude: float | None = None
    longitude: float | None = None
    owner_id: int

    class Config:
        from_attributes = True