from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.animal import Animal
from app.models.alert import Alert


# ============================================================================
# HERDSENSE AI — HEALTH INTELLIGENCE ENGINE
# ============================================================================
#
# Central deterministic health-analysis engine for incoming animal telemetry.
#
# Responsibilities:
#
# 1. Read the latest telemetry values.
# 2. Evaluate configured health thresholds.
# 3. Calculate a normalized 0–100 health score.
# 4. Calculate a normalized 0–100 risk score.
# 5. Determine the operational risk level.
# 6. Update Animal.health_status.
# 7. Create/update the main Health Monitoring alert.
# 8. Prevent duplicate unresolved Health Monitoring alerts.
# 9. Resolve Health Monitoring alerts when conditions normalize.
# 10. Return structured intelligence for the telemetry pipeline.
#
# IMPORTANT:
#
# This service evaluates observable telemetry conditions.
#
# It does NOT diagnose disease.
#
# Disease prediction should be handled by a separate intelligence layer
# capable of combining historical telemetry, trends, behavior and other
# signals.
#
# ============================================================================


# ============================================================================
# HEALTH THRESHOLDS
# ============================================================================

TEMPERATURE_WARNING = 39.5
TEMPERATURE_CRITICAL = 41.0

HEART_RATE_WARNING = 120
HEART_RATE_CRITICAL = 140

ACTIVITY_WARNING = 25
ACTIVITY_CRITICAL = 10


# ============================================================================
# NORMAL OPERATING RANGES
# ============================================================================

TEMPERATURE_NORMAL_MIN = 37.5
TEMPERATURE_NORMAL_MAX = 39.5

HEART_RATE_NORMAL_MIN = 48
HEART_RATE_NORMAL_MAX = 84

ACTIVITY_NORMAL_MIN = 40


# ============================================================================
# ALERT CONFIGURATION
# ============================================================================

ALERT_TYPE = "Health Monitoring"


# ============================================================================
# SCORE CONFIGURATION
# ============================================================================

TEMPERATURE_WARNING_PENALTY = 15
TEMPERATURE_CRITICAL_PENALTY = 35

HEART_RATE_WARNING_PENALTY = 15
HEART_RATE_CRITICAL_PENALTY = 30

ACTIVITY_WARNING_PENALTY = 15
ACTIVITY_CRITICAL_PENALTY = 30


# ============================================================================
# HELPERS
# ============================================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    """
    Keep a numeric value inside a configured range.
    """

    return max(
        minimum,
        min(
            value,
            maximum,
        ),
    )


# ============================================================================
# HEALTH SCORE
# ============================================================================

def calculate_health_score(
    temperature: float | None,
    heart_rate: int | None,
    activity: int | None,
) -> int:
    """
    Calculate a deterministic 0–100 health score.

    Missing telemetry values do not receive a penalty.

    The score represents the current observable telemetry condition.
    It is not a medical diagnosis.
    """

    score = 100.0

    # ========================================================================
    # TEMPERATURE
    # ========================================================================

    if temperature is not None:

        if temperature >= TEMPERATURE_CRITICAL:

            score -= TEMPERATURE_CRITICAL_PENALTY

        elif temperature >= TEMPERATURE_WARNING:

            score -= TEMPERATURE_WARNING_PENALTY

        elif temperature < TEMPERATURE_NORMAL_MIN:

            score -= 20

    # ========================================================================
    # HEART RATE
    # ========================================================================

    if heart_rate is not None:

        if heart_rate >= HEART_RATE_CRITICAL:

            score -= HEART_RATE_CRITICAL_PENALTY

        elif heart_rate >= HEART_RATE_WARNING:

            score -= HEART_RATE_WARNING_PENALTY

        elif heart_rate < HEART_RATE_NORMAL_MIN:

            score -= 15

    # ========================================================================
    # ACTIVITY
    # ========================================================================

    if activity is not None:

        if activity <= ACTIVITY_CRITICAL:

            score -= ACTIVITY_CRITICAL_PENALTY

        elif activity <= ACTIVITY_WARNING:

            score -= ACTIVITY_WARNING_PENALTY

        elif activity < ACTIVITY_NORMAL_MIN:

            score -= 10

    return int(
        clamp(
            score,
            0,
            100,
        )
    )


# ============================================================================
# RISK SCORE
# ============================================================================

def calculate_risk_score(
    health_score: int,
    critical_reasons: list[str],
    warning_reasons: list[str],
) -> int:
    """
    Convert health findings into a normalized 0–100 operational risk score.

    Higher value = higher operational risk.
    """

    risk_score = 100 - health_score

    risk_score += (
        len(critical_reasons) * 10
    )

    risk_score += (
        len(warning_reasons) * 5
    )

    return int(
        clamp(
            risk_score,
            0,
            100,
        )
    )


# ============================================================================
# RISK LEVEL
# ============================================================================

def determine_risk_level(
    risk_score: int,
) -> str:
    """
    Convert numerical risk score into an operational risk level.
    """

    if risk_score >= 70:
        return "Critical"

    if risk_score >= 40:
        return "Elevated"

    if risk_score >= 20:
        return "Moderate"

    return "Low"


# ============================================================================
# HEALTH ANALYSIS
# ============================================================================

def analyze_health(
    telemetry,
    animal: Animal,
    db: Session,
    commit: bool = True,
):
    """
    Analyze the latest telemetry for an animal.

    Returns:

        {
            "health_status": str,
            "severity": str | None,
            "health_score": int,
            "risk_score": int,
            "risk_level": str,
            "reasons": list[str],
            "alerts": list[str],
            "possible_diseases": list[str],
            "recommendations": list[str],
            "alert": Alert | None,
        }

    The response is compatible with the canonical telemetry service
    and the existing frontend intelligence payloads.
    """

    # ========================================================================
    # READ TELEMETRY
    # ========================================================================

    temperature = (
        float(telemetry.temperature)
        if telemetry.temperature is not None
        else None
    )

    heart_rate = (
        int(telemetry.heart_rate)
        if telemetry.heart_rate is not None
        else None
    )

    activity = (
        int(telemetry.activity)
        if telemetry.activity is not None
        else None
    )

    # ========================================================================
    # COLLECT FINDINGS
    # ========================================================================

    critical_reasons: list[str] = []

    warning_reasons: list[str] = []

    alerts: list[str] = []

    recommendations: list[str] = []

    # IMPORTANT:
    #
    # Disease diagnosis/prediction is intentionally not performed here.
    #
    # This field remains available for compatibility with the existing
    # telemetry/frontend contract.
    #
    possible_diseases: list[str] = []

    # ========================================================================
    # TEMPERATURE
    # ========================================================================

    if temperature is not None:

        if temperature >= TEMPERATURE_CRITICAL:

            reason = (
                f"Critical temperature: "
                f"{temperature:.1f}°C"
            )

            critical_reasons.append(
                reason
            )

            alerts.append(
                "Critically elevated body temperature"
            )

            recommendations.append(
                "Isolate the animal from additional stress "
                "and arrange immediate professional assessment."
            )

        elif temperature >= TEMPERATURE_WARNING:

            reason = (
                f"Elevated temperature: "
                f"{temperature:.1f}°C"
            )

            warning_reasons.append(
                reason
            )

            alerts.append(
                "Elevated body temperature"
            )

            recommendations.append(
                "Monitor temperature closely and observe "
                "the animal for additional abnormal signs."
            )

        elif temperature < TEMPERATURE_NORMAL_MIN:

            reason = (
                f"Low temperature: "
                f"{temperature:.1f}°C"
            )

            warning_reasons.append(
                reason
            )

            alerts.append(
                "Low body temperature"
            )

            recommendations.append(
                "Continue monitoring body temperature "
                "and observe the animal for signs of weakness."
            )

    # ========================================================================
    # HEART RATE
    # ========================================================================

    if heart_rate is not None:

        if heart_rate >= HEART_RATE_CRITICAL:

            reason = (
                f"Critical heart rate: "
                f"{heart_rate} BPM"
            )

            critical_reasons.append(
                reason
            )

            alerts.append(
                "Critically elevated heart rate"
            )

            recommendations.append(
                "Reduce physical stress and arrange "
                "immediate animal assessment."
            )

        elif heart_rate >= HEART_RATE_WARNING:

            reason = (
                f"Elevated heart rate: "
                f"{heart_rate} BPM"
            )

            warning_reasons.append(
                reason
            )

            alerts.append(
                "Elevated heart rate"
            )

            recommendations.append(
                "Reduce physical stress and continue "
                "monitoring heart rate."
            )

        elif heart_rate < HEART_RATE_NORMAL_MIN:

            reason = (
                f"Low heart rate: "
                f"{heart_rate} BPM"
            )

            warning_reasons.append(
                reason
            )

            alerts.append(
                "Low heart rate"
            )

            recommendations.append(
                "Monitor the animal closely for weakness "
                "or reduced responsiveness."
            )

    # ========================================================================
    # ACTIVITY
    # ========================================================================

    if activity is not None:

        if activity <= ACTIVITY_CRITICAL:

            reason = (
                f"Very low activity: "
                f"{activity}%"
            )

            critical_reasons.append(
                reason
            )

            alerts.append(
                "Critically low activity"
            )

            recommendations.append(
                "Inspect the animal immediately and "
                "observe feeding, movement and behavior."
            )

        elif activity <= ACTIVITY_WARNING:

            reason = (
                f"Reduced activity: "
                f"{activity}%"
            )

            warning_reasons.append(
                reason
            )

            alerts.append(
                "Reduced activity detected"
            )

            recommendations.append(
                "Observe feeding, movement and general behavior."
            )

    # ========================================================================
    # DETERMINE OVERALL HEALTH STATUS
    # ========================================================================

    if critical_reasons:

        health_status = "Critical"

        severity = "Critical"

        reasons = critical_reasons

    elif warning_reasons:

        health_status = "Warning"

        severity = "Warning"

        reasons = warning_reasons

    else:

        health_status = "Healthy"

        severity = None

        reasons = []

    # ========================================================================
    # HEALTH SCORE
    # ========================================================================

    health_score = calculate_health_score(
        temperature=temperature,
        heart_rate=heart_rate,
        activity=activity,
    )

    # ========================================================================
    # RISK SCORE
    # ========================================================================

    risk_score = calculate_risk_score(
        health_score=health_score,
        critical_reasons=critical_reasons,
        warning_reasons=warning_reasons,
    )

    # ========================================================================
    # RISK LEVEL
    # ========================================================================

    risk_level = determine_risk_level(
        risk_score=risk_score,
    )

    # ========================================================================
    # HEALTHY STATE NORMALIZATION
    # ========================================================================

    if health_status == "Healthy":

        alerts = []

        recommendations = []

        possible_diseases = []

    # ========================================================================
    # UPDATE ANIMAL
    # ========================================================================

    animal.health_status = health_status

    # ========================================================================
    # ALERT HANDLING
    # ========================================================================

    created_alert = None

    updated_alert = None

    # ========================================================================
    # CREATE / UPDATE MAIN HEALTH ALERT
    # ========================================================================

    if health_status in (
        "Warning",
        "Critical",
    ):

        message = (
            f"{animal.name} requires attention. "
            + "; ".join(reasons)
        )

        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.animal_id == animal.id,
                Alert.resolved == False,
                Alert.alert_type == ALERT_TYPE,
            )
            .order_by(
                Alert.timestamp.desc()
            )
            .first()
        )

        # --------------------------------------------------------------------
        # CREATE
        # --------------------------------------------------------------------

        if not existing_alert:

            created_alert = Alert(
                animal_id=animal.id,
                alert_type=ALERT_TYPE,
                severity=severity,
                message=message,
                resolved=False,
            )

            db.add(
                created_alert
            )

        # --------------------------------------------------------------------
        # UPDATE
        # --------------------------------------------------------------------

        else:

            severity_changed = (
                existing_alert.severity
                != severity
            )

            message_changed = (
                existing_alert.message
                != message
            )

            if (
                severity_changed
                or message_changed
            ):

                existing_alert.severity = severity

                existing_alert.message = message

                updated_alert = (
                    existing_alert
                )

    # ========================================================================
    # RESOLVE HEALTH ALERTS
    # ========================================================================

    else:

        active_health_alerts = (
            db.query(Alert)
            .filter(
                Alert.animal_id == animal.id,
                Alert.resolved == False,
                Alert.alert_type == ALERT_TYPE,
            )
            .all()
        )

        for alert in active_health_alerts:

            alert.resolved = True

    # ========================================================================
    # COMMIT
    # ========================================================================

    if commit:

        db.commit()

        if created_alert:

            db.refresh(
                created_alert
            )

        if updated_alert:

            db.refresh(
                updated_alert
            )

    # ========================================================================
    # RETURN
    # ========================================================================

    return {
        "health_status": health_status,

        "severity": severity,

        "health_score": health_score,

        "risk_score": risk_score,

        "risk_level": risk_level,

        "reasons": reasons,

        "alerts": alerts,

        "possible_diseases": list(
            dict.fromkeys(
                possible_diseases
            )
        ),

        "recommendations": list(
            dict.fromkeys(
                recommendations
            )
        ),

        "alert": (
            created_alert
            or updated_alert
        ),
    }