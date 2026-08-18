from typing import Dict


NORMAL_TEMP = (37.5, 39.5)
NORMAL_HEART_RATE = (48, 84)
NORMAL_ACTIVITY = 40


def analyze_health(
    temperature: float,
    heart_rate: int,
    activity: int
) -> Dict:

    score = 100

    alerts = []

    diseases = []

    recommendations = []

    # Temperature
    if temperature > 40:

        score -= 30

        alerts.append("High body temperature")

        diseases.extend([
            "Foot and Mouth Disease",
            "Respiratory Infection",
            "Heat Stress"
        ])

        recommendations.append(
            "Isolate the animal immediately."
        )

    elif temperature < 37:

        score -= 20

        alerts.append("Low body temperature")

        recommendations.append(
            "Monitor body temperature."
        )

    # Heart Rate
    if heart_rate > NORMAL_HEART_RATE[1]:

        score -= 20

        alerts.append("High heart rate")

        recommendations.append(
            "Reduce physical stress."
        )

    elif heart_rate < NORMAL_HEART_RATE[0]:

        score -= 10

        alerts.append("Low heart rate")

    # Activity
    if activity < NORMAL_ACTIVITY:

        score -= 20

        alerts.append("Low activity detected")

        recommendations.append(
            "Observe feeding and movement."
        )

    if score >= 90:

        status = "Healthy"

    elif score >= 70:

        status = "Monitor"

    elif score >= 50:

        status = "Warning"

    else:

        status = "Critical"

    return {

        "health_score": score,

        "health_status": status,

        "alerts": alerts,

        "possible_diseases": list(set(diseases)),

        "recommendations": recommendations
    }