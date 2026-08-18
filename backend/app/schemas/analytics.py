from pydantic import BaseModel


class AnalyticsResponse(BaseModel):
    total_records: int

    average_temperature: float | None
    average_heart_rate: float | None
    average_activity: float | None
    average_battery: float | None

    max_temperature: float | None
    min_temperature: float | None