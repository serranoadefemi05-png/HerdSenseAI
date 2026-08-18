from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean
from typing import Any

from sqlalchemy.orm import Session

from app.models.animal import Animal
from app.models.telemetry import Telemetry


# ============================================================================
# HERDSENSE AI — PRODUCTION ANIMAL INTELLIGENCE ENGINE
# ============================================================================
#
# Deterministic, explainable livestock intelligence layer.
#
# This engine:
#
#   • evaluates current physiological telemetry
#   • calculates a health score
#   • calculates an operational risk score
#   • evaluates signal trends
#   • compares current readings against historical baseline
#   • detects persistent abnormalities
#   • detects multi-signal physiological patterns
#   • evaluates telemetry freshness
#   • evaluates device/battery condition
#   • evaluates telemetry data quality
#   • produces explainable risk factors
#   • produces an operational recommendation
#   • calculates confidence
#
# IMPORTANT:
#
# This engine does NOT diagnose diseases.
#
# It identifies:
#
#   abnormal physiological signals
#   persistent deviations
#   worsening trends
#   device/telemetry risks
#   operational escalation requirements
#
# The architecture is deterministic by design so that decisions remain:
#
#   • explainable
#   • auditable
#   • reproducible
#   • predictable
#   • suitable for production telemetry
#   • ready for future ML augmentation
#
# ============================================================================


# ============================================================================
# ENGINE CONFIGURATION
# ============================================================================

ENGINE_NAME = "HerdSense AI Animal Intelligence Engine"
ENGINE_VERSION = "3.0.0"
ENGINE_MODE = "deterministic"


# ---------------------------------------------------------------------------
# TELEMETRY
# ---------------------------------------------------------------------------

MAX_TELEMETRY_RECORDS = 50

MIN_TREND_RECORDS = 3
MIN_BASELINE_RECORDS = 5

PERSISTENCE_WINDOW = 5
PERSISTENCE_THRESHOLD = 3


# ---------------------------------------------------------------------------
# FRESHNESS
# ---------------------------------------------------------------------------

STALE_AFTER_MINUTES = 15
VERY_STALE_AFTER_MINUTES = 60


# ---------------------------------------------------------------------------
# TEMPERATURE
# ---------------------------------------------------------------------------

TEMPERATURE_CRITICAL = 41.0
TEMPERATURE_WARNING = 39.5

TEMPERATURE_BASELINE_DEVIATION = 1.5
TEMPERATURE_TREND_THRESHOLD = 0.5


# ---------------------------------------------------------------------------
# HEART RATE
# ---------------------------------------------------------------------------

HEART_RATE_CRITICAL = 140
HEART_RATE_WARNING = 120

HEART_RATE_BASELINE_DEVIATION = 25.0
HEART_RATE_TREND_THRESHOLD = 8.0


# ---------------------------------------------------------------------------
# ACTIVITY
# ---------------------------------------------------------------------------

ACTIVITY_CRITICAL = 10
ACTIVITY_WARNING = 25

ACTIVITY_BASELINE_DEVIATION = 30.0
ACTIVITY_TREND_THRESHOLD = 8.0


# ---------------------------------------------------------------------------
# BATTERY
# ---------------------------------------------------------------------------

BATTERY_CRITICAL = 15
BATTERY_WARNING = 30


# ---------------------------------------------------------------------------
# SIGNAL VALIDATION
# ---------------------------------------------------------------------------

TEMPERATURE_MIN = 30.0
TEMPERATURE_MAX = 50.0

HEART_RATE_MIN = 20.0
HEART_RATE_MAX = 250.0

ACTIVITY_MIN = 0.0
ACTIVITY_MAX = 100.0

BATTERY_MIN = 0.0
BATTERY_MAX = 100.0

LATITUDE_MIN = -90.0
LATITUDE_MAX = 90.0

LONGITUDE_MIN = -180.0
LONGITUDE_MAX = 180.0


# ============================================================================
# GENERIC HELPERS
# ============================================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(maximum, value),
    )


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
    default: int | None = None,
) -> int | None:
    try:
        if value is None:
            return default

        return int(value)

    except (TypeError, ValueError):
        return default


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_datetime(
    value: datetime | None,
) -> datetime | None:
    if value is None:
        return None

    try:
        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)

    except (TypeError, ValueError):
        return None


def iso_timestamp(
    value: datetime | None,
) -> str | None:
    normalized = normalize_datetime(value)

    if normalized is None:
        return None

    return normalized.isoformat()


def telemetry_timestamp(
    record: Telemetry,
) -> float:
    timestamp = normalize_datetime(
        record.timestamp
    )

    if timestamp is None:
        return 0.0

    try:
        return timestamp.timestamp()

    except (AttributeError, TypeError, ValueError, OSError):
        return 0.0


# ============================================================================
# SIGNAL VALIDATION
# ============================================================================

def validate_signal(
    value: Any,
    minimum: float,
    maximum: float,
) -> float | None:
    number = safe_float(value)

    if number is None:
        return None

    if number < minimum or number > maximum:
        return None

    return number


def validate_temperature(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        TEMPERATURE_MIN,
        TEMPERATURE_MAX,
    )


def validate_heart_rate(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        HEART_RATE_MIN,
        HEART_RATE_MAX,
    )


def validate_activity(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        ACTIVITY_MIN,
        ACTIVITY_MAX,
    )


def validate_battery(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        BATTERY_MIN,
        BATTERY_MAX,
    )


def validate_latitude(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        LATITUDE_MIN,
        LATITUDE_MAX,
    )


def validate_longitude(
    value: Any,
) -> float | None:
    return validate_signal(
        value,
        LONGITUDE_MIN,
        LONGITUDE_MAX,
    )


# ============================================================================
# HEALTH STATUS
# ============================================================================

def calculate_health_status(
    temperature: float | None,
    heart_rate: float | None,
    activity: float | None,
) -> str:
    """
    Determine current physiological operating status.

    Priority:
        Critical > Warning > Healthy
    """

    if (
        temperature is not None
        and temperature >= TEMPERATURE_CRITICAL
    ):
        return "Critical"

    if (
        heart_rate is not None
        and heart_rate >= HEART_RATE_CRITICAL
    ):
        return "Critical"

    if (
        activity is not None
        and activity <= ACTIVITY_CRITICAL
    ):
        return "Critical"

    if (
        temperature is not None
        and temperature >= TEMPERATURE_WARNING
    ):
        return "Warning"

    if (
        heart_rate is not None
        and heart_rate >= HEART_RATE_WARNING
    ):
        return "Warning"

    if (
        activity is not None
        and activity <= ACTIVITY_WARNING
    ):
        return "Warning"

    return "Healthy"


# ============================================================================
# HEALTH SCORE
# ============================================================================

def calculate_health_score(
    temperature: float | None,
    heart_rate: float | None,
    activity: float | None,
) -> int:
    """
    Calculate a transparent physiological health score from 0–100.
    """

    score = 100.0

    if temperature is not None:

        if temperature >= TEMPERATURE_CRITICAL:
            score -= 35

        elif temperature >= TEMPERATURE_WARNING:
            score -= 18

    if heart_rate is not None:

        if heart_rate >= HEART_RATE_CRITICAL:
            score -= 30

        elif heart_rate >= HEART_RATE_WARNING:
            score -= 15

    if activity is not None:

        if activity <= ACTIVITY_CRITICAL:
            score -= 30

        elif activity <= ACTIVITY_WARNING:
            score -= 15

    return int(
        clamp(
            score,
            0,
            100,
        )
    )


# ============================================================================
# TREND ENGINE
# ============================================================================

def calculate_trend(
    values: list[float],
    threshold: float,
) -> str:
    """
    Values are ordered newest -> oldest.
    """

    if len(values) < MIN_TREND_RECORDS:
        return "insufficient_data"

    recent = values[0]
    older = values[-1]

    difference = recent - older

    if abs(difference) < threshold:
        return "stable"

    if difference > 0:
        return "increasing"

    return "decreasing"


def calculate_trend_delta(
    values: list[float],
) -> float | None:
    if len(values) < 2:
        return None

    return round(
        values[0] - values[-1],
        2,
    )


def calculate_trend_strength(
    values: list[float],
    threshold: float,
) -> str:
    if len(values) < MIN_TREND_RECORDS:
        return "insufficient_data"

    delta = abs(
        values[0] - values[-1]
    )

    if delta < threshold:
        return "minimal"

    if delta < threshold * 2:
        return "moderate"

    return "strong"


# ============================================================================
# BASELINE ENGINE
# ============================================================================

def calculate_baseline(
    values: list[float],
) -> float | None:
    if len(values) < MIN_BASELINE_RECORDS:
        return None

    return round(
        mean(values),
        2,
    )


def calculate_baseline_deviation(
    current: float | None,
    baseline: float | None,
) -> float | None:
    if current is None or baseline is None:
        return None

    return round(
        current - baseline,
        2,
    )


# ============================================================================
# DATA FRESHNESS
# ============================================================================

def calculate_freshness(
    timestamp: datetime | None,
) -> dict[str, Any]:

    normalized = normalize_datetime(
        timestamp
    )

    if normalized is None:
        return {
            "status": "unknown",
            "age_minutes": None,
            "stale": True,
        }

    try:
        age_seconds = max(
            0,
            (
                utc_now() - normalized
            ).total_seconds(),
        )

        age_minutes = round(
            age_seconds / 60,
            1,
        )

    except (TypeError, ValueError):
        return {
            "status": "unknown",
            "age_minutes": None,
            "stale": True,
        }

    if age_minutes >= VERY_STALE_AFTER_MINUTES:

        return {
            "status": "very_stale",
            "age_minutes": age_minutes,
            "stale": True,
        }

    if age_minutes >= STALE_AFTER_MINUTES:

        return {
            "status": "stale",
            "age_minutes": age_minutes,
            "stale": True,
        }

    return {
        "status": "live",
        "age_minutes": age_minutes,
        "stale": False,
    }


# ============================================================================
# DATA QUALITY ENGINE
# ============================================================================

def calculate_data_quality(
    current: Telemetry,
    telemetry_count: int,
) -> dict[str, Any]:

    signals = {
        "temperature": validate_temperature(
            current.temperature
        ),
        "heart_rate": validate_heart_rate(
            current.heart_rate
        ),
        "activity": validate_activity(
            current.activity
        ),
        "battery": validate_battery(
            current.battery
        ),
        "latitude": validate_latitude(
            current.latitude
        ),
        "longitude": validate_longitude(
            current.longitude
        ),
    }

    available = sum(
        value is not None
        for value in signals.values()
    )

    total = len(signals)

    completeness = round(
        (
            available / total
        ) * 100
    )

    invalid_signals = [
        name
        for name, value in signals.items()
        if value is None
    ]

    if (
        completeness >= 90
        and telemetry_count >= MIN_BASELINE_RECORDS
    ):
        quality = "high"

    elif completeness >= 70:
        quality = "medium"

    else:
        quality = "low"

    return {
        "quality": quality,
        "completeness": completeness,
        "telemetry_count": telemetry_count,
        "available_signals": available,
        "expected_signals": total,
        "invalid_or_missing_signals": invalid_signals,
    }


# ============================================================================
# PERSISTENCE ENGINE
# ============================================================================

def count_persistent_abnormalities(
    records: list[Telemetry],
) -> dict[str, int]:

    window = records[
        :PERSISTENCE_WINDOW
    ]

    temperature_count = 0
    heart_rate_count = 0
    activity_count = 0

    for record in window:

        temperature = validate_temperature(
            record.temperature
        )

        heart_rate = validate_heart_rate(
            record.heart_rate
        )

        activity = validate_activity(
            record.activity
        )

        if (
            temperature is not None
            and temperature >= TEMPERATURE_WARNING
        ):
            temperature_count += 1

        if (
            heart_rate is not None
            and heart_rate >= HEART_RATE_WARNING
        ):
            heart_rate_count += 1

        if (
            activity is not None
            and activity <= ACTIVITY_WARNING
        ):
            activity_count += 1

    return {
        "temperature": temperature_count,
        "heart_rate": heart_rate_count,
        "activity": activity_count,
    }


# ============================================================================
# MULTI-SIGNAL PATTERN ENGINE
# ============================================================================

def detect_physiological_patterns(
    temperature: float | None,
    heart_rate: float | None,
    activity: float | None,
) -> list[dict[str, Any]]:

    patterns: list[dict[str, Any]] = []

    if (
        temperature is not None
        and heart_rate is not None
        and activity is not None
        and temperature >= TEMPERATURE_WARNING
        and heart_rate >= HEART_RATE_WARNING
        and activity <= ACTIVITY_WARNING
    ):
        patterns.append(
            {
                "pattern": "multi_signal_stress",
                "severity": "critical",
                "message": (
                    "Temperature and heart rate are elevated "
                    "while activity is substantially reduced."
                ),
            }
        )

    elif (
        temperature is not None
        and heart_rate is not None
        and temperature >= TEMPERATURE_WARNING
        and heart_rate >= HEART_RATE_WARNING
    ):
        patterns.append(
            {
                "pattern": "temperature_cardiovascular_elevation",
                "severity": "warning",
                "message": (
                    "Temperature and heart rate are simultaneously "
                    "above configured operating ranges."
                ),
            }
        )

    elif (
        heart_rate is not None
        and activity is not None
        and heart_rate >= HEART_RATE_WARNING
        and activity <= ACTIVITY_WARNING
    ):
        patterns.append(
            {
                "pattern": "elevated_rate_low_activity",
                "severity": "warning",
                "message": (
                    "Heart rate is elevated while activity "
                    "is substantially reduced."
                ),
            }
        )

    return patterns


# ============================================================================
# DEVICE HEALTH
# ============================================================================

def calculate_device_health(
    battery: float | None,
    freshness: dict[str, Any],
) -> dict[str, Any]:

    if battery is None:

        battery_status = "unknown"

    elif battery <= BATTERY_CRITICAL:

        battery_status = "critical"

    elif battery <= BATTERY_WARNING:

        battery_status = "low"

    else:

        battery_status = "healthy"

    if freshness["status"] == "very_stale":

        connectivity_status = "critical"

    elif freshness["status"] == "stale":

        connectivity_status = "degraded"

    elif freshness["status"] == "live":

        connectivity_status = "healthy"

    else:

        connectivity_status = "unknown"

    if (
        battery_status == "critical"
        or connectivity_status == "critical"
    ):
        overall = "critical"

    elif (
        battery_status == "low"
        or connectivity_status == "degraded"
    ):
        overall = "degraded"

    elif (
        battery_status == "healthy"
        and connectivity_status == "healthy"
    ):
        overall = "healthy"

    else:
        overall = "unknown"

    return {
        "overall": overall,
        "battery": {
            "value": battery,
            "status": battery_status,
        },
        "connectivity": {
            "status": connectivity_status,
            "freshness": freshness["status"],
        },
    }


# ============================================================================
# RISK FACTORS
# ============================================================================

def build_risk_factors(
    temperature: float | None,
    heart_rate: float | None,
    activity: float | None,
    battery: float | None,
    temperature_trend: str,
    heart_rate_trend: str,
    activity_trend: str,
    temperature_baseline: float | None,
    heart_rate_baseline: float | None,
    activity_baseline: float | None,
    persistent_counts: dict[str, int],
    freshness: dict[str, Any],
    physiological_patterns: list[dict[str, Any]],
) -> list[dict[str, Any]]:

    factors: list[dict[str, Any]] = []

    # ------------------------------------------------------------------------
    # TEMPERATURE
    # ------------------------------------------------------------------------

    if temperature is not None:

        if temperature >= TEMPERATURE_CRITICAL:

            factors.append(
                {
                    "signal": "temperature",
                    "severity": "critical",
                    "message": (
                        f"Body temperature is critically elevated "
                        f"at {temperature:.1f}°C."
                    ),
                }
            )

        elif temperature >= TEMPERATURE_WARNING:

            factors.append(
                {
                    "signal": "temperature",
                    "severity": "warning",
                    "message": (
                        f"Body temperature is elevated "
                        f"at {temperature:.1f}°C."
                    ),
                }
            )

    # ------------------------------------------------------------------------
    # HEART RATE
    # ------------------------------------------------------------------------

    if heart_rate is not None:

        if heart_rate >= HEART_RATE_CRITICAL:

            factors.append(
                {
                    "signal": "heart_rate",
                    "severity": "critical",
                    "message": (
                        f"Heart rate is critically elevated "
                        f"at {heart_rate:.0f} BPM."
                    ),
                }
            )

        elif heart_rate >= HEART_RATE_WARNING:

            factors.append(
                {
                    "signal": "heart_rate",
                    "severity": "warning",
                    "message": (
                        f"Heart rate is elevated "
                        f"at {heart_rate:.0f} BPM."
                    ),
                }
            )

    # ------------------------------------------------------------------------
    # ACTIVITY
    # ------------------------------------------------------------------------

    if activity is not None:

        if activity <= ACTIVITY_CRITICAL:

            factors.append(
                {
                    "signal": "activity",
                    "severity": "critical",
                    "message": (
                        f"Activity is critically low "
                        f"at {activity:.0f}%."
                    ),
                }
            )

        elif activity <= ACTIVITY_WARNING:

            factors.append(
                {
                    "signal": "activity",
                    "severity": "warning",
                    "message": (
                        f"Activity is reduced "
                        f"at {activity:.0f}%."
                    ),
                }
            )

    # ------------------------------------------------------------------------
    # BASELINE DEVIATION
    # ------------------------------------------------------------------------

    if (
        temperature is not None
        and temperature_baseline is not None
        and (
            temperature
            - temperature_baseline
        ) >= TEMPERATURE_BASELINE_DEVIATION
    ):

        factors.append(
            {
                "signal": "temperature_baseline",
                "severity": "warning",
                "message": (
                    "Temperature is materially above "
                    "the animal's recent baseline."
                ),
            }
        )

    if (
        heart_rate is not None
        and heart_rate_baseline is not None
        and (
            heart_rate
            - heart_rate_baseline
        ) >= HEART_RATE_BASELINE_DEVIATION
    ):

        factors.append(
            {
                "signal": "heart_rate_baseline",
                "severity": "warning",
                "message": (
                    "Heart rate is materially above "
                    "the animal's recent baseline."
                ),
            }
        )

    if (
        activity is not None
        and activity_baseline is not None
        and (
            activity_baseline
            - activity
        ) >= ACTIVITY_BASELINE_DEVIATION
    ):

        factors.append(
            {
                "signal": "activity_baseline",
                "severity": "warning",
                "message": (
                    "Activity is materially below "
                    "the animal's recent baseline."
                ),
            }
        )

    # ------------------------------------------------------------------------
    # PERSISTENCE
    # ------------------------------------------------------------------------

    for signal, count in persistent_counts.items():

        if count >= PERSISTENCE_THRESHOLD:

            factors.append(
                {
                    "signal": f"{signal}_persistence",
                    "severity": "critical",
                    "message": (
                        f"{signal.replace('_', ' ').title()} "
                        f"abnormality persisted across "
                        f"{count} recent readings."
                    ),
                }
            )

    # ------------------------------------------------------------------------
    # TRENDS
    # ------------------------------------------------------------------------

    if (
        temperature_trend == "increasing"
        and temperature is not None
        and temperature >= 39.0
    ):

        factors.append(
            {
                "signal": "temperature_trend",
                "severity": "warning",
                "message": (
                    "Temperature is trending upward."
                ),
            }
        )

    if (
        heart_rate_trend == "increasing"
        and heart_rate is not None
        and heart_rate >= 110
    ):

        factors.append(
            {
                "signal": "heart_rate_trend",
                "severity": "warning",
                "message": (
                    "Heart rate is trending upward."
                ),
            }
        )

    if (
        activity_trend == "decreasing"
        and activity is not None
        and activity <= 40
    ):

        factors.append(
            {
                "signal": "activity_trend",
                "severity": "warning",
                "message": (
                    "Activity is trending downward."
                ),
            }
        )

    # ------------------------------------------------------------------------
    # BATTERY
    # ------------------------------------------------------------------------

    if battery is not None:

        if battery <= BATTERY_CRITICAL:

            factors.append(
                {
                    "signal": "battery",
                    "severity": "critical",
                    "message": (
                        f"Monitoring device battery is critically "
                        f"low at {battery:.0f}%."
                    ),
                }
            )

        elif battery <= BATTERY_WARNING:

            factors.append(
                {
                    "signal": "battery",
                    "severity": "warning",
                    "message": (
                        f"Monitoring device battery is low "
                        f"at {battery:.0f}%."
                    ),
                }
            )

    # ------------------------------------------------------------------------
    # FRESHNESS
    # ------------------------------------------------------------------------

    if freshness["status"] == "very_stale":

        factors.append(
            {
                "signal": "telemetry_freshness",
                "severity": "critical",
                "message": (
                    "Telemetry has not been received within "
                    "the expected monitoring window."
                ),
            }
        )

    elif freshness["status"] == "stale":

        factors.append(
            {
                "signal": "telemetry_freshness",
                "severity": "warning",
                "message": (
                    "Latest telemetry is older than "
                    "the expected monitoring interval."
                ),
            }
        )

    # ------------------------------------------------------------------------
    # PHYSIOLOGICAL PATTERNS
    # ------------------------------------------------------------------------

    for pattern in physiological_patterns:

        factors.append(
            {
                "signal": pattern["pattern"],
                "severity": pattern["severity"],
                "message": pattern["message"],
            }
        )

    return factors


# ============================================================================
# RISK SCORE
# ============================================================================

def calculate_risk_score(
    health_score: int,
    persistent_risks: int,
    trend_risks: int,
    pattern_risks: int,
    stale: bool,
    battery: float | None,
) -> int:

    risk = 100 - health_score

    risk += min(
        persistent_risks * 7,
        21,
    )

    risk += min(
        trend_risks * 4,
        12,
    )

    risk += min(
        pattern_risks * 10,
        20,
    )

    if stale:
        risk += 8

    if battery is not None:

        if battery <= BATTERY_CRITICAL:
            risk += 10

        elif battery <= BATTERY_WARNING:
            risk += 5

    return int(
        clamp(
            risk,
            0,
            100,
        )
    )


def get_risk_level(
    risk_score: int,
) -> str:

    if risk_score >= 70:
        return "critical"

    if risk_score >= 40:
        return "elevated"

    if risk_score >= 20:
        return "moderate"

    return "low"


# ============================================================================
# RECOMMENDATION ENGINE
# ============================================================================

def build_recommendation(
    health_score: int,
    health_status: str,
    risk_factors: list[dict[str, Any]],
    freshness: dict[str, Any],
    device_health: dict[str, Any],
) -> dict[str, str]:

    critical_count = sum(
        factor["severity"] == "critical"
        for factor in risk_factors
    )

    warning_count = sum(
        factor["severity"] == "warning"
        for factor in risk_factors
    )

    if freshness["status"] == "very_stale":

        return {
            "priority": "critical",
            "action": (
                "Verify the monitoring device immediately and "
                "restore fresh telemetry before relying on the "
                "current physiological assessment."
            ),
        }

    if device_health["overall"] == "critical":

        return {
            "priority": "critical",
            "action": (
                "Inspect the monitoring device and restore "
                "reliable telemetry transmission."
            ),
        }

    if (
        health_status == "Critical"
        or critical_count >= 2
        or health_score <= 40
    ):

        return {
            "priority": "critical",
            "action": (
                "Immediate physical inspection is recommended. "
                "Verify the animal's current condition and "
                "escalate to veterinary personnel where appropriate."
            ),
        }

    if (
        health_status == "Warning"
        or critical_count == 1
        or health_score <= 65
    ):

        return {
            "priority": "high",
            "action": (
                "Increase monitoring frequency and inspect the "
                "animal for changes in behaviour, feeding, movement "
                "and physical condition."
            ),
        }

    if warning_count > 0:

        return {
            "priority": "medium",
            "action": (
                "Continue close monitoring and review the detected "
                "telemetry deviations."
            ),
        }

    return {
        "priority": "normal",
        "action": (
            "Continue normal monitoring. Current telemetry is "
            "within the configured operating ranges."
        ),
    }


# ============================================================================
# CONFIDENCE ENGINE
# ============================================================================

def calculate_confidence(
    telemetry_count: int,
    data_quality: dict[str, Any],
    freshness: dict[str, Any],
    baseline_available: bool,
    trend_available: bool,
) -> str:

    score = 0

    # Evidence volume
    if telemetry_count >= MIN_BASELINE_RECORDS:
        score += 30

    elif telemetry_count >= MIN_TREND_RECORDS:
        score += 20

    else:
        score += 5

    # Data completeness
    score += int(
        data_quality["completeness"]
        * 0.30
    )

    # Freshness
    if freshness["status"] == "live":
        score += 20

    elif freshness["status"] == "stale":
        score += 8

    # Historical context
    if baseline_available:
        score += 10

    if trend_available:
        score += 10

    if score >= 80:
        return "high"

    if score >= 55:
        return "medium"

    return "low"


# ============================================================================
# MAIN INTELLIGENCE ENGINE
# ============================================================================

def analyze_animal_intelligence(
    animal: Animal,
    db: Session,
) -> dict[str, Any]:

    # ========================================================================
    # LOAD TELEMETRY
    # ========================================================================

    telemetry_records = (
        db.query(Telemetry)
        .filter(
            Telemetry.animal_id == animal.id,
        )
        .order_by(
            Telemetry.timestamp.desc(),
        )
        .limit(
            MAX_TELEMETRY_RECORDS,
        )
        .all()
    )

    telemetry_records.sort(
        key=telemetry_timestamp,
        reverse=True,
    )

    telemetry_count = len(
        telemetry_records
    )

    # ========================================================================
    # NO TELEMETRY
    # ========================================================================

    if not telemetry_records:

        return {
            "animal_id": animal.id,
            "animal_name": animal.name,
            "health_score": None,
            "risk_score": None,
            "risk_level": "unknown",
            "health_status": (
                animal.health_status
                or "Unknown"
            ),
            "data_status": "insufficient_data",
            "confidence": "low",

            "freshness": {
                "status": "unknown",
                "age_minutes": None,
                "stale": True,
            },

            "data_quality": {
                "quality": "low",
                "completeness": 0,
                "telemetry_count": 0,
                "available_signals": 0,
                "expected_signals": 6,
                "invalid_or_missing_signals": [
                    "temperature",
                    "heart_rate",
                    "activity",
                    "battery",
                    "latitude",
                    "longitude",
                ],
            },

            "trend": {
                "temperature": "insufficient_data",
                "heart_rate": "insufficient_data",
                "activity": "insufficient_data",
            },

            "trend_strength": {
                "temperature": "insufficient_data",
                "heart_rate": "insufficient_data",
                "activity": "insufficient_data",
            },

            "trend_delta": {
                "temperature": None,
                "heart_rate": None,
                "activity": None,
            },

            "baseline": {
                "temperature": None,
                "heart_rate": None,
                "activity": None,
            },

            "baseline_deviation": {
                "temperature": None,
                "heart_rate": None,
                "activity": None,
            },

            "persistence": {
                "temperature": 0,
                "heart_rate": 0,
                "activity": 0,
            },

            "patterns": [],

            "device_health": {
                "overall": "unknown",
                "battery": {
                    "value": None,
                    "status": "unknown",
                },
                "connectivity": {
                    "status": "unknown",
                    "freshness": "unknown",
                },
            },

            "current": {
                "temperature": None,
                "heart_rate": None,
                "activity": None,
                "battery": None,
                "latitude": None,
                "longitude": None,
                "timestamp": None,
            },

            "risk_factors": [],

            "recommendation": {
                "priority": "critical",
                "action": (
                    "No telemetry history is available. "
                    "Connect the monitoring device and "
                    "verify telemetry transmission."
                ),
            },

            "telemetry_count": 0,

            "engine": {
                "name": ENGINE_NAME,
                "version": ENGINE_VERSION,
                "mode": ENGINE_MODE,
                "diagnosis": False,
            },
        }

    # ========================================================================
    # CURRENT TELEMETRY
    # ========================================================================

    current = telemetry_records[0]

    temperature = validate_temperature(
        current.temperature
    )

    heart_rate = validate_heart_rate(
        current.heart_rate
    )

    activity = validate_activity(
        current.activity
    )

    battery = validate_battery(
        current.battery
    )

    latitude = validate_latitude(
        current.latitude
    )

    longitude = validate_longitude(
        current.longitude
    )

    # ========================================================================
    # HISTORICAL SIGNALS
    # ========================================================================

    temperatures = [
        value
        for value in (
            validate_temperature(
                record.temperature
            )
            for record in telemetry_records
        )
        if value is not None
    ]

    heart_rates = [
        value
        for value in (
            validate_heart_rate(
                record.heart_rate
            )
            for record in telemetry_records
        )
        if value is not None
    ]

    activities = [
        value
        for value in (
            validate_activity(
                record.activity
            )
            for record in telemetry_records
        )
        if value is not None
    ]

    # ========================================================================
    # HISTORICAL BASELINE
    #
    # IMPORTANT:
    # The current reading is excluded from the baseline when enough
    # historical records exist. This prevents a new abnormal reading
    # from artificially moving the baseline toward itself.
    # ========================================================================

    historical_temperatures = temperatures[1:]
    historical_heart_rates = heart_rates[1:]
    historical_activities = activities[1:]

    temperature_baseline = calculate_baseline(
        historical_temperatures
    )

    heart_rate_baseline = calculate_baseline(
        historical_heart_rates
    )

    activity_baseline = calculate_baseline(
        historical_activities
    )

    # ========================================================================
    # HEALTH
    # ========================================================================

    health_score = calculate_health_score(
        temperature=temperature,
        heart_rate=heart_rate,
        activity=activity,
    )

    health_status = calculate_health_status(
        temperature=temperature,
        heart_rate=heart_rate,
        activity=activity,
    )

    # ========================================================================
    # TRENDS
    # ========================================================================

    temperature_trend = calculate_trend(
        temperatures,
        TEMPERATURE_TREND_THRESHOLD,
    )

    heart_rate_trend = calculate_trend(
        heart_rates,
        HEART_RATE_TREND_THRESHOLD,
    )

    activity_trend = calculate_trend(
        activities,
        ACTIVITY_TREND_THRESHOLD,
    )

    temperature_trend_strength = calculate_trend_strength(
        temperatures,
        TEMPERATURE_TREND_THRESHOLD,
    )

    heart_rate_trend_strength = calculate_trend_strength(
        heart_rates,
        HEART_RATE_TREND_THRESHOLD,
    )

    activity_trend_strength = calculate_trend_strength(
        activities,
        ACTIVITY_TREND_THRESHOLD,
    )

    # ========================================================================
    # BASELINE DEVIATION
    # ========================================================================

    temperature_deviation = (
        calculate_baseline_deviation(
            temperature,
            temperature_baseline,
        )
    )

    heart_rate_deviation = (
        calculate_baseline_deviation(
            heart_rate,
            heart_rate_baseline,
        )
    )

    activity_deviation = (
        calculate_baseline_deviation(
            activity,
            activity_baseline,
        )
    )

    # ========================================================================
    # PERSISTENCE
    # ========================================================================

    persistence = (
        count_persistent_abnormalities(
            telemetry_records
        )
    )

    persistent_risks = sum(
        count >= PERSISTENCE_THRESHOLD
        for count in persistence.values()
    )

    # ========================================================================
    # FRESHNESS
    # ========================================================================

    freshness = calculate_freshness(
        current.timestamp
    )

    # ========================================================================
    # DATA QUALITY
    # ========================================================================

    data_quality = calculate_data_quality(
        current=current,
        telemetry_count=telemetry_count,
    )

    # ========================================================================
    # PHYSIOLOGICAL PATTERNS
    # ========================================================================

    physiological_patterns = detect_physiological_patterns(
        temperature=temperature,
        heart_rate=heart_rate,
        activity=activity,
    )

    pattern_risks = sum(
        pattern["severity"] == "critical"
        for pattern in physiological_patterns
    )

    # ========================================================================
    # DEVICE HEALTH
    # ========================================================================

    device_health = calculate_device_health(
        battery=battery,
        freshness=freshness,
    )

    # ========================================================================
    # RISK FACTORS
    # ========================================================================

    risk_factors = build_risk_factors(
        temperature=temperature,
        heart_rate=heart_rate,
        activity=activity,
        battery=battery,
        temperature_trend=temperature_trend,
        heart_rate_trend=heart_rate_trend,
        activity_trend=activity_trend,
        temperature_baseline=temperature_baseline,
        heart_rate_baseline=heart_rate_baseline,
        activity_baseline=activity_baseline,
        persistent_counts=persistence,
        freshness=freshness,
        physiological_patterns=physiological_patterns,
    )

    trend_risks = sum(
        factor["signal"].endswith("_trend")
        for factor in risk_factors
    )

    # ========================================================================
    # RISK
    # ========================================================================

    risk_score = calculate_risk_score(
        health_score=health_score,
        persistent_risks=persistent_risks,
        trend_risks=trend_risks,
        pattern_risks=pattern_risks,
        stale=freshness["stale"],
        battery=battery,
    )

    risk_level = get_risk_level(
        risk_score
    )

    # ========================================================================
    # RECOMMENDATION
    # ========================================================================

    recommendation = build_recommendation(
        health_score=health_score,
        health_status=health_status,
        risk_factors=risk_factors,
        freshness=freshness,
        device_health=device_health,
    )

    # ========================================================================
    # DATA STATUS
    # ========================================================================

    if telemetry_count >= MIN_BASELINE_RECORDS:

        data_status = "sufficient"

    elif telemetry_count >= MIN_TREND_RECORDS:

        data_status = "limited"

    else:

        data_status = "insufficient"

    # ========================================================================
    # CONFIDENCE
    # ========================================================================

    baseline_available = (
        temperature_baseline is not None
        or heart_rate_baseline is not None
        or activity_baseline is not None
    )

    trend_available = (
        temperature_trend != "insufficient_data"
        or heart_rate_trend != "insufficient_data"
        or activity_trend != "insufficient_data"
    )

    confidence = calculate_confidence(
        telemetry_count=telemetry_count,
        data_quality=data_quality,
        freshness=freshness,
        baseline_available=baseline_available,
        trend_available=trend_available,
    )

    # ========================================================================
    # RETURN PRODUCTION INTELLIGENCE REPORT
    # ========================================================================

    return {
        "animal_id": animal.id,
        "animal_name": animal.name,

        "health_score": health_score,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "health_status": health_status,

        "data_status": data_status,
        "confidence": confidence,

        "freshness": freshness,

        "data_quality": data_quality,

        "trend": {
            "temperature": temperature_trend,
            "heart_rate": heart_rate_trend,
            "activity": activity_trend,
        },

        "trend_strength": {
            "temperature": temperature_trend_strength,
            "heart_rate": heart_rate_trend_strength,
            "activity": activity_trend_strength,
        },

        "trend_delta": {
            "temperature": calculate_trend_delta(
                temperatures
            ),
            "heart_rate": calculate_trend_delta(
                heart_rates
            ),
            "activity": calculate_trend_delta(
                activities
            ),
        },

        "baseline": {
            "temperature": temperature_baseline,
            "heart_rate": heart_rate_baseline,
            "activity": activity_baseline,
        },

        "baseline_deviation": {
            "temperature": temperature_deviation,
            "heart_rate": heart_rate_deviation,
            "activity": activity_deviation,
        },

        "persistence": persistence,

        "patterns": physiological_patterns,

        "device_health": device_health,

        "current": {
            "temperature": temperature,
            "heart_rate": heart_rate,
            "activity": activity,
            "battery": battery,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": iso_timestamp(
                current.timestamp
            ),
        },

        "risk_factors": risk_factors,

        "recommendation": recommendation,

        "telemetry_count": telemetry_count,

        "engine": {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "mode": ENGINE_MODE,
            "diagnosis": False,
        },
    }