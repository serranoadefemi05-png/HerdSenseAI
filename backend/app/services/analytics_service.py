from typing import List
from statistics import mean

from app.models.telemetry import Telemetry


def summarize_telemetry(records: List[Telemetry]):

    if not records:
        return {
            "total_records": 0,
            "average_temperature": None,
            "average_heart_rate": None,
            "average_activity": None,
            "average_battery": None,
            "max_temperature": None,
            "min_temperature": None
        }

    temperatures = [r.temperature for r in records]
    heart_rates = [r.heart_rate for r in records]
    activities = [r.activity for r in records]
    batteries = [r.battery for r in records]

    return {
        "total_records": len(records),
        "average_temperature": round(mean(temperatures), 2),
        "average_heart_rate": round(mean(heart_rates), 2),
        "average_activity": round(mean(activities), 2),
        "average_battery": round(mean(batteries), 2),
        "max_temperature": max(temperatures),
        "min_temperature": min(temperatures)
    }