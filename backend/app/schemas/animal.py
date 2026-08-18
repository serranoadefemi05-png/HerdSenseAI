from pydantic import BaseModel


class AnimalCreate(BaseModel):
    tag_id: str
    name: str
    species: str
    breed: str | None = None
    gender: str
    age: int | None = None
    weight: float | None = None
    farm_id: int


class AnimalResponse(BaseModel):
    id: int
    tag_id: str
    name: str
    species: str
    breed: str | None = None
    gender: str
    age: int | None = None
    weight: float | None = None
    health_status: str
    temperature: float
    latitude: float | None = None
    longitude: float | None = None
    farm_id: int

    class Config:
        from_attributes = True