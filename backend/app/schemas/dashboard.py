from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_farms: int
    total_animals: int

    healthy_animals: int
    warning_animals: int
    critical_animals: int

    average_temperature: float