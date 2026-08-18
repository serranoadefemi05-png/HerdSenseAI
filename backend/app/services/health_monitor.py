from sqlalchemy.orm import Session

from app.models.animal import Animal
from app.models.alert import Alert


def analyze_health(
    db: Session,
    animal: Animal,
    temperature: float,
    heart_rate: int,
    activity: int,
    commit: bool = True,
):
    """
    Analyze livestock telemetry and update animal health status.

    These are prototype monitoring thresholds.
    They should later be replaced/calibrated using
    veterinary data and ML models.
    """

    critical_reasons = []
    warning_reasons = []

    # --------------------------------------------------
    # TEMPERATURE
    # --------------------------------------------------

    if temperature >= 40.5:
        critical_reasons.append(
            f"High temperature: {temperature}°C"
        )

    elif temperature >= 39.5:
        warning_reasons.append(
            f"Elevated temperature: {temperature}°C"
        )

    # --------------------------------------------------
    # HEART RATE
    # --------------------------------------------------

    if heart_rate >= 140:
        critical_reasons.append(
            f"High heart rate: {heart_rate} BPM"
        )

    elif heart_rate >= 110:
        warning_reasons.append(
            f"Elevated heart rate: {heart_rate} BPM"
        )

    # --------------------------------------------------
    # ACTIVITY
    # --------------------------------------------------

    if activity <= 10:
        critical_reasons.append(
            f"Very low activity: {activity}%"
        )

    elif activity <= 30:
        warning_reasons.append(
            f"Low activity: {activity}%"
        )

    # --------------------------------------------------
    # DETERMINE OVERALL STATUS
    # --------------------------------------------------

    if critical_reasons:
        status = "Critical"
        severity = "Critical"
        reasons = critical_reasons

    elif warning_reasons:
        status = "Warning"
        severity = "Warning"
        reasons = warning_reasons

    else:
        status = "Healthy"
        severity = None
        reasons = []

    # --------------------------------------------------
    # UPDATE ANIMAL STATUS
    # --------------------------------------------------

    animal.health_status = status

    # --------------------------------------------------
    # CREATE ALERT
    # --------------------------------------------------

    if status in ["Warning", "Critical"]:

        alert_type = "Health Monitoring"

        message = (
            f"{animal.name} requires attention. "
            + "; ".join(reasons)
        )

        # Check for existing unresolved alert
        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.animal_id == animal.id,
                Alert.resolved == False,
                Alert.alert_type == alert_type,
            )
            .first()
        )

        # Don't create duplicate unresolved alerts
        if not existing_alert:

            new_alert = Alert(
                animal_id=animal.id,
                alert_type=alert_type,
                severity=severity,
                message=message,
                resolved=False,
            )

            db.add(new_alert)

    # --------------------------------------------------
    # COMMIT
    # --------------------------------------------------

    if commit:
        db.commit()

    return {
        "health_status": status,
        "severity": severity,
        "reasons": reasons,
    }