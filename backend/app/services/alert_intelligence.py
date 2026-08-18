from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.animal import Animal
from app.models.telemetry import Telemetry


# ============================================================================
# HERDSENSE AI — ADVANCED ALERT INTELLIGENCE
# ============================================================================
#
# Converts telemetry patterns into operational alerts.
#
# IMPORTANT:
# This service does NOT diagnose disease.
#
# It identifies observable telemetry conditions that require attention.
#
# Responsibilities:
#
# 1. Signal-specific alerts
# 2. Baseline deviation alerts
# 3. Persistence alerts
# 4. Trend alerts
# 5. Multi-signal physiological stress
# 6. Telemetry freshness alerts
# 7. Alert deduplication
# 8. Alert upgrading/downgrading
# 9. Automatic resolution when conditions disappear
#
# ============================================================================


# ============================================================================
# CONFIGURATION
# ============================================================================

TEMPERATURE_WARNING = 39.5
TEMPERATURE_CRITICAL = 41.0

HEART_RATE_WARNING = 120
HEART_RATE_CRITICAL = 140

ACTIVITY_WARNING = 25
ACTIVITY_CRITICAL = 10

TEMPERATURE_BASELINE_DEVIATION = 1.5
HEART_RATE_BASELINE_DEVIATION = 25
ACTIVITY_BASELINE_DEVIATION = -30

PERSISTENCE_READINGS = 3

STALE_TELEMETRY_MINUTES = 30

HISTORY_LIMIT = 5


# ============================================================================
# ALERT TYPES
# ============================================================================

ALERT_TYPE_TEMPERATURE = "Temperature Intelligence"

ALERT_TYPE_HEART_RATE = "Heart Rate Intelligence"

ALERT_TYPE_ACTIVITY = "Activity Intelligence"

ALERT_TYPE_TEMPERATURE_BASELINE = "Temperature Baseline"

ALERT_TYPE_HEART_RATE_BASELINE = "Heart Rate Baseline"

ALERT_TYPE_ACTIVITY_BASELINE = "Activity Baseline"

ALERT_TYPE_TEMPERATURE_PERSISTENCE = "Temperature Persistence"

ALERT_TYPE_HEART_RATE_PERSISTENCE = "Heart Rate Persistence"

ALERT_TYPE_ACTIVITY_PERSISTENCE = "Activity Persistence"

ALERT_TYPE_TEMPERATURE_TREND = "Temperature Trend"

ALERT_TYPE_HEART_RATE_TREND = "Heart Rate Trend"

ALERT_TYPE_ACTIVITY_TREND = "Activity Trend"

ALERT_TYPE_MULTI_SIGNAL = "Multi-Signal Stress"

ALERT_TYPE_TELEMETRY_FRESHNESS = "Telemetry Freshness"


INTELLIGENCE_ALERT_TYPES = {
    ALERT_TYPE_TEMPERATURE,
    ALERT_TYPE_HEART_RATE,
    ALERT_TYPE_ACTIVITY,
    ALERT_TYPE_TEMPERATURE_BASELINE,
    ALERT_TYPE_HEART_RATE_BASELINE,
    ALERT_TYPE_ACTIVITY_BASELINE,
    ALERT_TYPE_TEMPERATURE_PERSISTENCE,
    ALERT_TYPE_HEART_RATE_PERSISTENCE,
    ALERT_TYPE_ACTIVITY_PERSISTENCE,
    ALERT_TYPE_TEMPERATURE_TREND,
    ALERT_TYPE_HEART_RATE_TREND,
    ALERT_TYPE_ACTIVITY_TREND,
    ALERT_TYPE_MULTI_SIGNAL,
    ALERT_TYPE_TELEMETRY_FRESHNESS,
}


# ============================================================================
# HELPERS
# ============================================================================

def safe_float(
    value: Any,
    default: float | None = None,
) -> float | None:

    try:

        if value is None:
            return default

        number = float(value)

        if number != number:
            return default

        return number

    except (TypeError, ValueError):

        return default


def safe_int(
    value: Any,
    default: int = 0,
) -> int:

    try:

        if value is None:
            return default

        return int(value)

    except (TypeError, ValueError):

        return default


def utc_now() -> datetime:

    return datetime.now(timezone.utc)


def normalize_timestamp(
    timestamp: datetime | None,
) -> datetime | None:

    if timestamp is None:
        return None

    if timestamp.tzinfo is None:

        return timestamp.replace(
            tzinfo=timezone.utc
        )

    return timestamp


# ============================================================================
# TELEMETRY HISTORY
# ============================================================================

def get_recent_telemetry(
    animal_id: int,
    db: Session,
    limit: int = HISTORY_LIMIT,
) -> list[Telemetry]:

    return (
        db.query(Telemetry)
        .filter(
            Telemetry.animal_id == animal_id,
        )
        .order_by(
            Telemetry.timestamp.desc(),
        )
        .limit(limit)
        .all()
    )


def get_previous_telemetry(
    animal_id: int,
    current_telemetry_id: int,
    db: Session,
    limit: int = HISTORY_LIMIT,
) -> list[Telemetry]:
    """
    Return telemetry readings that occurred before the
    current telemetry record.

    This is intentionally separate from get_recent_telemetry()
    because baseline calculations must not include the current
    reading.
    """

    return (
        db.query(Telemetry)
        .filter(
            Telemetry.animal_id == animal_id,
            Telemetry.id != current_telemetry_id,
        )
        .order_by(
            Telemetry.timestamp.desc(),
        )
        .limit(limit)
        .all()
    )


# ============================================================================
# BASELINE CALCULATION
# ============================================================================

def calculate_baseline(
    history: list[Telemetry],
) -> dict[str, float | None]:
    """
    Calculate the animal's recent baseline.

    IMPORTANT:
    The caller should provide historical readings only.

    The current telemetry reading must NOT be included in this
    calculation. This prevents the current reading from
    contaminating its own baseline.
    """

    if not history:

        return {
            "temperature": None,
            "heart_rate": None,
            "activity": None,
        }

    temperatures = [
        safe_float(item.temperature)
        for item in history
        if item.temperature is not None
    ]

    heart_rates = [
        safe_float(item.heart_rate)
        for item in history
        if item.heart_rate is not None
    ]

    activities = [
        safe_float(item.activity)
        for item in history
        if item.activity is not None
    ]

    return {
        "temperature": (
            sum(temperatures) / len(temperatures)
            if temperatures
            else None
        ),

        "heart_rate": (
            sum(heart_rates) / len(heart_rates)
            if heart_rates
            else None
        ),

        "activity": (
            sum(activities) / len(activities)
            if activities
            else None
        ),
    }


# ============================================================================
# TREND DETECTION
# ============================================================================

def calculate_trend(
    history: list[Telemetry],
    field: str,
) -> str:

    values: list[float] = []

    # History arrives newest first.
    # Reverse to chronological order.
    for item in reversed(history):

        value = safe_float(
            getattr(item, field, None)
        )

        if value is not None:

            values.append(value)

    if len(values) < 3:

        return "insufficient_data"

    first = values[0]
    last = values[-1]

    delta = last - first

    if field == "temperature":

        if delta >= 0.5:
            return "increasing"

        if delta <= -0.5:
            return "decreasing"

    elif field == "heart_rate":

        if delta >= 15:
            return "increasing"

        if delta <= -15:
            return "decreasing"

    elif field == "activity":

        if delta >= 15:
            return "increasing"

        if delta <= -15:
            return "decreasing"

    return "stable"


# ============================================================================
# PERSISTENCE
# ============================================================================

def is_temperature_abnormal(
    temperature: float | None,
) -> bool:

    return (
        temperature is not None
        and temperature >= TEMPERATURE_WARNING
    )


def is_heart_rate_abnormal(
    heart_rate: float | None,
) -> bool:

    return (
        heart_rate is not None
        and heart_rate >= HEART_RATE_WARNING
    )


def is_activity_abnormal(
    activity: float | None,
) -> bool:

    return (
        activity is not None
        and activity <= ACTIVITY_WARNING
    )


def count_persistent_abnormality(
    history: list[Telemetry],
    signal: str,
) -> int:

    count = 0

    for item in history:

        if signal == "temperature":

            value = safe_float(
                item.temperature
            )

            abnormal = is_temperature_abnormal(
                value
            )

        elif signal == "heart_rate":

            value = safe_float(
                item.heart_rate
            )

            abnormal = is_heart_rate_abnormal(
                value
            )

        elif signal == "activity":

            value = safe_float(
                item.activity
            )

            abnormal = is_activity_abnormal(
                value
            )

        else:

            abnormal = False

        if abnormal:

            count += 1

        else:

            break

    return count


# ============================================================================
# ALERT CREATION / UPDATE
# ============================================================================

def get_existing_alert(
    animal_id: int,
    alert_type: str,
    db: Session,
) -> Alert | None:

    return (
        db.query(Alert)
        .filter(
            Alert.animal_id == animal_id,
            Alert.alert_type == alert_type,
            Alert.resolved == False,
        )
        .order_by(
            Alert.timestamp.desc()
        )
        .first()
    )


def upsert_alert(
    animal: Animal,
    db: Session,
    alert_type: str,
    severity: str,
    message: str,
) -> tuple[Alert, bool]:

    existing_alert = get_existing_alert(
        animal_id=animal.id,
        alert_type=alert_type,
        db=db,
    )

    # ========================================================================
    # CREATE
    # ========================================================================

    if not existing_alert:

        alert = Alert(
            animal_id=animal.id,
            alert_type=alert_type,
            severity=severity,
            message=message,
            resolved=False,
        )

        db.add(alert)

        db.flush()

        return alert, True

    # ========================================================================
    # UPDATE
    # ========================================================================

    changed = False

    if existing_alert.severity != severity:

        existing_alert.severity = severity

        changed = True

    if existing_alert.message != message:

        existing_alert.message = message

        changed = True

    return existing_alert, changed


# ============================================================================
# RESOLVE ALERT
# ============================================================================

def resolve_alert(
    animal_id: int,
    alert_type: str,
    db: Session,
) -> bool:

    active_alerts = (
        db.query(Alert)
        .filter(
            Alert.animal_id == animal_id,
            Alert.alert_type == alert_type,
            Alert.resolved == False,
        )
        .all()
    )

    changed = False

    for alert in active_alerts:

        alert.resolved = True

        changed = True

    return changed


# ============================================================================
# TELEMETRY FRESHNESS
# ============================================================================

def evaluate_freshness(
    telemetry: Telemetry,
) -> tuple[bool, str]:

    timestamp = normalize_timestamp(
        telemetry.timestamp
    )

    if timestamp is None:

        return (
            True,
            "Telemetry timestamp is unavailable.",
        )

    age_seconds = (
        utc_now() - timestamp
    ).total_seconds()

    age_minutes = age_seconds / 60

    if age_minutes >= STALE_TELEMETRY_MINUTES:

        return (
            True,
            (
                "Telemetry has not been received within "
                "the expected monitoring window."
            ),
        )

    return False, ""


# ============================================================================
# MAIN INTELLIGENCE SYNCHRONIZATION
# ============================================================================

def synchronize_animal_alerts(
    telemetry: Telemetry,
    animal: Animal,
    db: Session,
    commit: bool = True,
) -> list[Alert]:
    """
    Analyze the latest telemetry and synchronize advanced
    intelligence alerts.

    Returns alerts that were created or materially updated.

    This function does NOT diagnose disease.
    """

    triggered_alerts: list[Alert] = []

    # ========================================================================
    # HISTORY
    # ========================================================================
    #
    # Full recent history is used for:
    #
    # - persistence
    # - trend detection
    #
    # The current reading is already present in this history.
    #
    # ========================================================================

    history = get_recent_telemetry(
        animal_id=animal.id,
        db=db,
    )

    # ========================================================================
    # PREVIOUS HISTORY
    # ========================================================================
    #
    # IMPORTANT:
    # Baselines use ONLY previous readings.
    #
    # ========================================================================

    previous_history = get_previous_telemetry(
        animal_id=animal.id,
        current_telemetry_id=telemetry.id,
        db=db,
    )

    baseline = calculate_baseline(
        previous_history
    )

    # ========================================================================
    # CURRENT SIGNALS
    # ========================================================================

    temperature = safe_float(
        telemetry.temperature
    )

    heart_rate = safe_float(
        telemetry.heart_rate
    )

    activity = safe_float(
        telemetry.activity
    )

    # =========================================================================
    # TEMPERATURE
    # =========================================================================

    if temperature is not None:

        if temperature >= TEMPERATURE_CRITICAL:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_TEMPERATURE,
                severity="Critical",
                message=(
                    f"Body temperature is critically elevated "
                    f"at {temperature:.1f}°C."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        elif temperature >= TEMPERATURE_WARNING:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_TEMPERATURE,
                severity="Warning",
                message=(
                    f"Body temperature is elevated "
                    f"at {temperature:.1f}°C."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        else:

            resolve_alert(
                animal.id,
                ALERT_TYPE_TEMPERATURE,
                db,
            )

    # =========================================================================
    # HEART RATE
    # =========================================================================

    if heart_rate is not None:

        if heart_rate >= HEART_RATE_CRITICAL:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_HEART_RATE,
                severity="Critical",
                message=(
                    f"Heart rate is critically elevated "
                    f"at {heart_rate:.0f} BPM."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        elif heart_rate >= HEART_RATE_WARNING:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_HEART_RATE,
                severity="Warning",
                message=(
                    f"Heart rate is elevated "
                    f"at {heart_rate:.0f} BPM."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        else:

            resolve_alert(
                animal.id,
                ALERT_TYPE_HEART_RATE,
                db,
            )

    # =========================================================================
    # ACTIVITY
    # =========================================================================

    if activity is not None:

        if activity <= ACTIVITY_CRITICAL:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_ACTIVITY,
                severity="Critical",
                message=(
                    f"Activity is critically low "
                    f"at {activity:.0f}%."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        elif activity <= ACTIVITY_WARNING:

            alert, changed = upsert_alert(
                animal=animal,
                db=db,
                alert_type=ALERT_TYPE_ACTIVITY,
                severity="Warning",
                message=(
                    f"Activity is substantially reduced "
                    f"at {activity:.0f}%."
                ),
            )

            if changed:
                triggered_alerts.append(alert)

        else:

            resolve_alert(
                animal.id,
                ALERT_TYPE_ACTIVITY,
                db,
            )

    # =========================================================================
    # BASELINE — TEMPERATURE
    # =========================================================================

    baseline_temperature = baseline.get(
        "temperature"
    )

    if (
        temperature is not None
        and baseline_temperature is not None
        and temperature - baseline_temperature
        >= TEMPERATURE_BASELINE_DEVIATION
    ):

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_TEMPERATURE_BASELINE,
            severity="Warning",
            message=(
                f"Temperature is {temperature - baseline_temperature:.1f}°C "
                "above the animal's recent baseline."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_TEMPERATURE_BASELINE,
            db,
        )

    # =========================================================================
    # BASELINE — HEART RATE
    # =========================================================================

    baseline_heart_rate = baseline.get(
        "heart_rate"
    )

    if (
        heart_rate is not None
        and baseline_heart_rate is not None
        and heart_rate - baseline_heart_rate
        >= HEART_RATE_BASELINE_DEVIATION
    ):

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_HEART_RATE_BASELINE,
            severity="Warning",
            message=(
                f"Heart rate is {heart_rate - baseline_heart_rate:.0f} BPM "
                "above the animal's recent baseline."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_HEART_RATE_BASELINE,
            db,
        )

    # =========================================================================
    # BASELINE — ACTIVITY
    # =========================================================================

    baseline_activity = baseline.get(
        "activity"
    )

    if (
        activity is not None
        and baseline_activity is not None
        and activity - baseline_activity
        <= ACTIVITY_BASELINE_DEVIATION
    ):

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_ACTIVITY_BASELINE,
            severity="Warning",
            message=(
                f"Activity is {abs(activity - baseline_activity):.0f}% "
                "below the animal's recent baseline."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_ACTIVITY_BASELINE,
            db,
        )

    # =========================================================================
    # PERSISTENCE
    # =========================================================================

    temperature_persistence = (
        count_persistent_abnormality(
            history,
            "temperature",
        )
    )

    if temperature_persistence >= PERSISTENCE_READINGS:

        severity = (
            "Critical"
            if (
                temperature is not None
                and temperature >= TEMPERATURE_CRITICAL
            )
            else "Warning"
        )

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_TEMPERATURE_PERSISTENCE,
            severity=severity,
            message=(
                "Temperature abnormality persisted across "
                f"{temperature_persistence} recent readings."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_TEMPERATURE_PERSISTENCE,
            db,
        )

    heart_rate_persistence = (
        count_persistent_abnormality(
            history,
            "heart_rate",
        )
    )

    if heart_rate_persistence >= PERSISTENCE_READINGS:

        severity = (
            "Critical"
            if (
                heart_rate is not None
                and heart_rate >= HEART_RATE_CRITICAL
            )
            else "Warning"
        )

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_HEART_RATE_PERSISTENCE,
            severity=severity,
            message=(
                "Heart rate abnormality persisted across "
                f"{heart_rate_persistence} recent readings."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_HEART_RATE_PERSISTENCE,
            db,
        )

    activity_persistence = (
        count_persistent_abnormality(
            history,
            "activity",
        )
    )

    if activity_persistence >= PERSISTENCE_READINGS:

        severity = (
            "Critical"
            if (
                activity is not None
                and activity <= ACTIVITY_CRITICAL
            )
            else "Warning"
        )

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_ACTIVITY_PERSISTENCE,
            severity=severity,
            message=(
                "Activity abnormality persisted across "
                f"{activity_persistence} recent readings."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_ACTIVITY_PERSISTENCE,
            db,
        )

    # =========================================================================
    # TRENDS
    # =========================================================================

    temperature_trend = calculate_trend(
        history,
        "temperature",
    )

    if temperature_trend == "increasing":

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_TEMPERATURE_TREND,
            severity="Warning",
            message="Temperature is trending upward.",
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_TEMPERATURE_TREND,
            db,
        )

    heart_rate_trend = calculate_trend(
        history,
        "heart_rate",
    )

    if heart_rate_trend == "increasing":

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_HEART_RATE_TREND,
            severity="Warning",
            message="Heart rate is trending upward.",
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_HEART_RATE_TREND,
            db,
        )

    activity_trend = calculate_trend(
        history,
        "activity",
    )

    if activity_trend == "decreasing":

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_ACTIVITY_TREND,
            severity="Warning",
            message="Activity is trending downward.",
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_ACTIVITY_TREND,
            db,
        )

    # =========================================================================
    # MULTI-SIGNAL PHYSIOLOGICAL STRESS
    # =========================================================================

    multi_signal_stress = (
        temperature is not None
        and heart_rate is not None
        and activity is not None
        and temperature >= TEMPERATURE_WARNING
        and heart_rate >= HEART_RATE_WARNING
        and activity <= ACTIVITY_WARNING
    )

    if multi_signal_stress:

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_MULTI_SIGNAL,
            severity="Critical",
            message=(
                "Temperature and heart rate are elevated "
                "while activity is substantially reduced."
            ),
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_MULTI_SIGNAL,
            db,
        )

    # =========================================================================
    # TELEMETRY FRESHNESS
    # =========================================================================

    stale, freshness_message = evaluate_freshness(
        telemetry
    )

    if stale:

        alert, changed = upsert_alert(
            animal=animal,
            db=db,
            alert_type=ALERT_TYPE_TELEMETRY_FRESHNESS,
            severity="Critical",
            message=freshness_message,
        )

        if changed:
            triggered_alerts.append(alert)

    else:

        resolve_alert(
            animal.id,
            ALERT_TYPE_TELEMETRY_FRESHNESS,
            db,
        )

    # =========================================================================
    # COMMIT
    # =========================================================================

    if commit:

        db.commit()

        for alert in triggered_alerts:

            try:

                db.refresh(alert)

            except Exception:
                pass

    return triggered_alerts