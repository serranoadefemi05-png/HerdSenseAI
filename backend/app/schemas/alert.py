from pydantic import BaseModel
from datetime import datetime


class AlertResponse(BaseModel):
    id: int
    animal_id: int
    alert_type: str
    severity: str
    message: str
    resolved: bool
    timestamp: datetime

    class Config:
        from_attributes = True


class AlertResolve(BaseModel):
    resolved: bool = True