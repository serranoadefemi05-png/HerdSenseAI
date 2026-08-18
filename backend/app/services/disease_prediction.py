"""
HERDSENSE AI — DISEASE-RISK PREDICTION ENGINE

Explainable deterministic risk-prediction layer.

IMPORTANT:
This engine does NOT diagnose diseases.

It estimates operational risk patterns from:
- current physiological telemetry
- health score
- risk score
- signal trends
- baseline deviations
- persistence
- physiological patterns
- device health
- telemetry freshness
- data quality

The engine is deterministic, auditable and reproducible.

A future ML model can replace or augment these deterministic rules
without changing the API contract.
"""

from __future__ import annotations

from typing import Any


# =============================================================================
# ENGINE CONFIGURATION
# =============================================================================

ENGINE_NAME = "HerdSense AI Disease-Risk Prediction Engine"
ENGINE_VERSION = "1.0.0"
ENGINE_MODE = "deterministic"

HIGH_RISK_THRESHOLD = 70
MODERATE_RISK_THRESHOLD = 40

HIGH_CONFIDENCE_THRESHOLD = 75
MEDIUM_CONFIDENCE_THRESHOLD = 50


# =============================================================================
# SIGNAL THRESHOLDS
# =============================================================================

TEMPERATURE_ELEVATED = 39.5
TEMPERATURE_CRITICAL = 41.0

HEART_RATE_ELEVATED = 120
HEART_RATE_CRITICAL = 140

ACTIVITY_REDUCED = 25
ACTIVITY_CRITICAL = 10


# =============================================================================
# EVIDENCE WEIGHTS
# =============================================================================

TEMPERATURE_WEIGHT = 25
HEART_RATE_WEIGHT = 20
ACTIVITY_WEIGHT = 20

BASELINE_WEIGHT = 15
PERSISTENCE_WEIGHT = 15
TREND_WEIGHT = 10
PATTERN_WEIGHT = 20


# =============================================================================
# GENERIC HELPERS
# =============================================================================

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
    default: int = 0,
) -> int:
    try:
        if value is None:
            return default

        return int(value)

    except (TypeError, ValueError):
        return default


# =============================================================================
# RISK LEVEL
# =============================================================================

def get_risk_level(
    score: int,
) -> str:
    if score >= HIGH_RISK_THRESHOLD:
        return "high"

    if score >= MODERATE_RISK_THRESHOLD:
        return "moderate"

    return "low"


# =============================================================================
# CONFIDENCE
# =============================================================================

def calculate_confidence(
    intelligence: dict[str, Any],
) -> dict[str, Any]:

    score = 0

    telemetry_count = safe_int(
        intelligence.get("telemetry_count")
    )

    data_quality = (
        intelligence.get("data_quality")
        or {}
    )

    completeness = safe_float(
        data_quality.get("completeness"),
        0,
    )

    freshness = (
        intelligence.get("freshness")
        or {}
    )

    baseline = (
        intelligence.get("baseline")
        or {}
    )

    trend = (
        intelligence.get("trend")
        or {}
    )

    # Telemetry volume
    if telemetry_count >= 20:
        score += 25

    elif telemetry_count >= 10:
        score += 20

    elif telemetry_count >= 5:
        score += 15

    elif telemetry_count >= 3:
        score += 8

    else:
        score += 2

    # Data completeness
    score += int(
        clamp(
            completeness or 0,
            0,
            100,
        ) * 0.25
    )

    # Freshness
    freshness_status = freshness.get("status")

    if freshness_status == "live":
        score += 20

    elif freshness_status == "stale":
        score += 8

    # Baseline availability
    baseline_available = sum(
        value is not None
        for value in (
            baseline.get("temperature"),
            baseline.get("heart_rate"),
            baseline.get("activity"),
        )
    )

    if baseline_available >= 3:
        score += 15

    elif baseline_available >= 1:
        score += 8

    # Trend availability
    trend_available = sum(
        value not in (
            None,
            "insufficient_data",
        )
        for value in (
            trend.get("temperature"),
            trend.get("heart_rate"),
            trend.get("activity"),
        )
    )

    if trend_available >= 3:
        score += 15

    elif trend_available >= 1:
        score += 8

    score = int(
        clamp(
            score,
            0,
            100,
        )
    )

    if score >= HIGH_CONFIDENCE_THRESHOLD:
        level = "high"

    elif score >= MEDIUM_CONFIDENCE_THRESHOLD:
        level = "medium"

    else:
        level = "low"

    return {
        "score": score,
        "level": level,
    }


# =============================================================================
# EVIDENCE
# =============================================================================

def add_evidence(
    evidence: list[dict[str, Any]],
    signal: str,
    impact: str,
    message: str,
    weight: int,
) -> None:

    evidence.append(
        {
            "signal": signal,
            "impact": impact,
            "message": message,
            "weight": weight,
        }
    )


# =============================================================================
# TEMPERATURE RISK
# =============================================================================

def evaluate_temperature_risk(
    temperature: float | None,
) -> tuple[int, list[dict[str, Any]]]:

    if temperature is None:
        return 0, []

    evidence: list[dict[str, Any]] = []

    if temperature >= TEMPERATURE_CRITICAL:

        add_evidence(
            evidence,
            "temperature",
            "critical",
            (
                f"Body temperature is critically elevated "
                f"at {temperature:.1f}°C."
            ),
            TEMPERATURE_WEIGHT,
        )

        return 30, evidence

    if temperature >= TEMPERATURE_ELEVATED:

        add_evidence(
            evidence,
            "temperature",
            "elevated",
            (
                f"Body temperature is elevated "
                f"at {temperature:.1f}°C."
            ),
            TEMPERATURE_WEIGHT,
        )

        return 20, evidence

    return 0, evidence


# =============================================================================
# HEART RATE RISK
# =============================================================================

def evaluate_heart_rate_risk(
    heart_rate: float | None,
) -> tuple[int, list[dict[str, Any]]]:

    if heart_rate is None:
        return 0, []

    evidence: list[dict[str, Any]] = []

    if heart_rate >= HEART_RATE_CRITICAL:

        add_evidence(
            evidence,
            "heart_rate",
            "critical",
            (
                f"Heart rate is critically elevated "
                f"at {heart_rate:.0f} BPM."
            ),
            HEART_RATE_WEIGHT,
        )

        return 25, evidence

    if heart_rate >= HEART_RATE_ELEVATED:

        add_evidence(
            evidence,
            "heart_rate",
            "elevated",
            (
                f"Heart rate is elevated "
                f"at {heart_rate:.0f} BPM."
            ),
            HEART_RATE_WEIGHT,
        )

        return 15, evidence

    return 0, evidence


# =============================================================================
# ACTIVITY RISK
# =============================================================================

def evaluate_activity_risk(
    activity: float | None,
) -> tuple[int, list[dict[str, Any]]]:

    if activity is None:
        return 0, []

    evidence: list[dict[str, Any]] = []

    if activity <= ACTIVITY_CRITICAL:

        add_evidence(
            evidence,
            "activity",
            "critical",
            (
                f"Activity is critically low "
                f"at {activity:.0f}%."
            ),
            ACTIVITY_WEIGHT,
        )

        return 25, evidence

    if activity <= ACTIVITY_REDUCED:

        add_evidence(
            evidence,
            "activity",
            "reduced",
            (
                f"Activity is substantially reduced "
                f"at {activity:.0f}%."
            ),
            ACTIVITY_WEIGHT,
        )

        return 15, evidence

    return 0, evidence


# =============================================================================
# BASELINE RISK
# =============================================================================

def evaluate_baseline_risk(
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    deviations = (
        intelligence.get("baseline_deviation")
        or {}
    )

    score = 0
    evidence: list[dict[str, Any]] = []

    temperature_deviation = safe_float(
        deviations.get("temperature")
    )

    heart_rate_deviation = safe_float(
        deviations.get("heart_rate")
    )

    activity_deviation = safe_float(
        deviations.get("activity")
    )

    if (
        temperature_deviation is not None
        and temperature_deviation >= 1.5
    ):
        score += 7

        add_evidence(
            evidence,
            "temperature_baseline",
            "deviation",
            "Temperature is materially above the animal's recent baseline.",
            BASELINE_WEIGHT,
        )

    if (
        heart_rate_deviation is not None
        and heart_rate_deviation >= 25
    ):
        score += 7

        add_evidence(
            evidence,
            "heart_rate_baseline",
            "deviation",
            "Heart rate is materially above the animal's recent baseline.",
            BASELINE_WEIGHT,
        )

    if (
        activity_deviation is not None
        and activity_deviation <= -30
    ):
        score += 7

        add_evidence(
            evidence,
            "activity_baseline",
            "deviation",
            "Activity is materially below the animal's recent baseline.",
            BASELINE_WEIGHT,
        )

    return min(score, 15), evidence


# =============================================================================
# PERSISTENCE RISK
# =============================================================================

def evaluate_persistence_risk(
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    persistence = (
        intelligence.get("persistence")
        or {}
    )

    score = 0
    evidence: list[dict[str, Any]] = []

    for signal in (
        "temperature",
        "heart_rate",
        "activity",
    ):

        count = safe_int(
            persistence.get(signal)
        )

        if count >= 3:

            score += 5

            add_evidence(
                evidence,
                f"{signal}_persistence",
                "persistent",
                (
                    f"{signal.replace('_', ' ').title()} "
                    f"abnormality persisted across "
                    f"{count} recent readings."
                ),
                PERSISTENCE_WEIGHT,
            )

    return min(score, 15), evidence


# =============================================================================
# TREND RISK
# =============================================================================

def evaluate_trend_risk(
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    trends = (
        intelligence.get("trend")
        or {}
    )

    score = 0
    evidence: list[dict[str, Any]] = []

    if trends.get("temperature") == "increasing":

        score += 4

        add_evidence(
            evidence,
            "temperature_trend",
            "increasing",
            "Temperature is trending upward.",
            TREND_WEIGHT,
        )

    if trends.get("heart_rate") == "increasing":

        score += 4

        add_evidence(
            evidence,
            "heart_rate_trend",
            "increasing",
            "Heart rate is trending upward.",
            TREND_WEIGHT,
        )

    if trends.get("activity") == "decreasing":

        score += 5

        add_evidence(
            evidence,
            "activity_trend",
            "decreasing",
            "Activity is trending downward.",
            TREND_WEIGHT,
        )

    return min(score, 10), evidence


# =============================================================================
# PHYSIOLOGICAL PATTERN RISK
# =============================================================================

def evaluate_pattern_risk(
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    patterns = (
        intelligence.get("patterns")
        or []
    )

    score = 0
    evidence: list[dict[str, Any]] = []

    for pattern in patterns:

        if not isinstance(pattern, dict):
            continue

        severity = str(
            pattern.get("severity")
            or ""
        ).lower()

        pattern_name = (
            pattern.get("pattern")
            or "physiological_pattern"
        )

        message = (
            pattern.get("message")
            or "A multi-signal physiological pattern was detected."
        )

        if severity == "critical":

            score += 20

            add_evidence(
                evidence,
                pattern_name,
                "critical",
                message,
                PATTERN_WEIGHT,
            )

        elif severity in (
            "warning",
            "moderate",
        ):

            score += 10

            add_evidence(
                evidence,
                pattern_name,
                "warning",
                message,
                PATTERN_WEIGHT,
            )

    return min(score, 20), evidence


# =============================================================================
# RESPIRATORY PATTERN
# =============================================================================

def calculate_respiratory_risk(
    temperature: float | None,
    heart_rate: float | None,
    activity: float | None,
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    score = 0
    evidence: list[dict[str, Any]] = []

    if (
        temperature is not None
        and temperature >= TEMPERATURE_ELEVATED
    ):
        score += 30

        add_evidence(
            evidence,
            "temperature",
            "elevated",
            "Elevated temperature contributes to respiratory-pattern risk.",
            25,
        )

    if (
        heart_rate is not None
        and heart_rate >= HEART_RATE_ELEVATED
    ):
        score += 25

        add_evidence(
            evidence,
            "heart_rate",
            "elevated",
            "Elevated heart rate contributes to respiratory-pattern risk.",
            20,
        )

    if (
        activity is not None
        and activity <= ACTIVITY_REDUCED
    ):
        score += 25

        add_evidence(
            evidence,
            "activity",
            "reduced",
            "Reduced activity contributes to respiratory-pattern risk.",
            20,
        )

    trends = intelligence.get("trend") or {}

    if trends.get("activity") == "decreasing":

        score += 10

        add_evidence(
            evidence,
            "activity_trend",
            "decreasing",
            "Declining activity increases respiratory-pattern risk.",
            10,
        )

    return int(
        clamp(
            score,
            0,
            100,
        )
    ), evidence


# =============================================================================
# INFLAMMATORY PATTERN
# =============================================================================

def calculate_inflammatory_risk(
    temperature: float | None,
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    score = 0
    evidence: list[dict[str, Any]] = []

    if (
        temperature is not None
        and temperature >= TEMPERATURE_CRITICAL
    ):
        score += 60

        add_evidence(
            evidence,
            "temperature",
            "critical",
            "Critically elevated temperature increases inflammatory-pattern risk.",
            30,
        )

    elif (
        temperature is not None
        and temperature >= TEMPERATURE_ELEVATED
    ):
        score += 40

        add_evidence(
            evidence,
            "temperature",
            "elevated",
            "Elevated temperature increases inflammatory-pattern risk.",
            25,
        )

    persistence = (
        intelligence.get("persistence")
        or {}
    )

    if safe_int(
        persistence.get("temperature")
    ) >= 3:

        score += 25

        add_evidence(
            evidence,
            "temperature_persistence",
            "persistent",
            "Elevated temperature has persisted across recent readings.",
            15,
        )

    deviation = safe_float(
        (
            intelligence.get("baseline_deviation")
            or {}
        ).get("temperature")
    )

    if (
        deviation is not None
        and deviation >= 1.5
    ):
        score += 20

        add_evidence(
            evidence,
            "temperature_baseline",
            "deviation",
            "Temperature is materially above the recent baseline.",
            15,
        )

    return int(
        clamp(
            score,
            0,
            100,
        )
    ), evidence


# =============================================================================
# STRESS PATTERN
# =============================================================================

def calculate_stress_risk(
    heart_rate: float | None,
    activity: float | None,
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    score = 0
    evidence: list[dict[str, Any]] = []

    if (
        heart_rate is not None
        and heart_rate >= HEART_RATE_ELEVATED
    ):
        score += 35

        add_evidence(
            evidence,
            "heart_rate",
            "elevated",
            "Elevated heart rate contributes to stress-pattern risk.",
            20,
        )

    if (
        activity is not None
        and activity <= ACTIVITY_REDUCED
    ):
        score += 35

        add_evidence(
            evidence,
            "activity",
            "reduced",
            "Reduced activity contributes to stress-pattern risk.",
            20,
        )

    trends = intelligence.get("trend") or {}

    if trends.get("heart_rate") == "increasing":

        score += 15

        add_evidence(
            evidence,
            "heart_rate_trend",
            "increasing",
            "Heart rate is trending upward.",
            10,
        )

    if trends.get("activity") == "decreasing":

        score += 15

        add_evidence(
            evidence,
            "activity_trend",
            "decreasing",
            "Activity is trending downward.",
            10,
        )

    return int(
        clamp(
            score,
            0,
            100,
        )
    ), evidence


# =============================================================================
# MOBILITY PATTERN
# =============================================================================

def calculate_mobility_risk(
    activity: float | None,
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    score = 0
    evidence: list[dict[str, Any]] = []

    if (
        activity is not None
        and activity <= ACTIVITY_CRITICAL
    ):
        score += 70

        add_evidence(
            evidence,
            "activity",
            "critical",
            "Activity is critically reduced.",
            20,
        )

    elif (
        activity is not None
        and activity <= ACTIVITY_REDUCED
    ):
        score += 45

        add_evidence(
            evidence,
            "activity",
            "reduced",
            "Activity is substantially reduced.",
            20,
        )

    trends = intelligence.get("trend") or {}

    if trends.get("activity") == "decreasing":

        score += 25

        add_evidence(
            evidence,
            "activity_trend",
            "decreasing",
            "Activity is trending downward.",
            10,
        )

    return int(
        clamp(
            score,
            0,
            100,
        )
    ), evidence


# =============================================================================
# GENERAL HEALTH RISK
# =============================================================================

def calculate_general_health_risk(
    intelligence: dict[str, Any],
) -> tuple[int, list[dict[str, Any]]]:

    risk_score = safe_float(
        intelligence.get("risk_score"),
        0,
    )

    health_score = safe_float(
        intelligence.get("health_score"),
        100,
    )

    score = 0
    evidence: list[dict[str, Any]] = []

    if risk_score is not None:

        score += int(
            clamp(
                risk_score * 0.6,
                0,
                60,
            )
        )

    if health_score is not None:

        score += int(
            clamp(
                (100 - health_score) * 0.4,
                0,
                40,
            )
        )

    risk_factors = (
        intelligence.get("risk_factors")
        or []
    )

    for factor in risk_factors:

        if not isinstance(factor, dict):
            continue

        severity = str(
            factor.get("severity")
            or ""
        ).lower()

        if severity == "critical":

            add_evidence(
                evidence,
                factor.get(
                    "signal",
                    "risk_factor",
                ),
                "critical",
                factor.get(
                    "message",
                    "Critical risk factor detected.",
                ),
                20,
            )

        elif severity in (
            "warning",
            "moderate",
        ):

            add_evidence(
                evidence,
                factor.get(
                    "signal",
                    "risk_factor",
                ),
                "warning",
                factor.get(
                    "message",
                    "Warning risk factor detected.",
                ),
                10,
            )

    return int(
        clamp(
            score,
            0,
            100,
        )
    ), evidence


# =============================================================================
# PREDICTION OBJECT
# =============================================================================

def build_prediction(
    name: str,
    label: str,
    score: int,
    evidence: list[dict[str, Any]],
    confidence: dict[str, Any],
    recommendation: str,
) -> dict[str, Any]:

    return {
        "prediction": name,
        "label": label,
        "risk_score": score,
        "risk_level": get_risk_level(score),
        "confidence": confidence["level"],
        "confidence_score": confidence["score"],
        "evidence": evidence,
        "recommendation": recommendation,
        "diagnosis": False,
    }


# =============================================================================
# RECOMMENDATION
# =============================================================================

def build_prediction_recommendation(
    highest_risk: dict[str, Any],
) -> str:

    score = safe_int(
        highest_risk.get("risk_score")
    )

    if score >= 70:

        return (
            "Increase monitoring immediately and inspect the animal "
            "for corresponding behavioural or physiological changes. "
            "Escalate to veterinary personnel where appropriate."
        )

    if score >= 40:

        return (
            "Increase monitoring frequency and review the animal's "
            "recent behaviour, movement, feeding and physiological signals."
        )

    return (
        "Continue normal monitoring while observing for changes "
        "in physiological signals or behaviour."
    )


# =============================================================================
# MAIN PREDICTION ENGINE
# =============================================================================

def predict_animal_health_risks(
    intelligence: dict[str, Any],
) -> dict[str, Any]:
    """
    Generate explainable operational health-risk predictions.

    This function does not diagnose disease.
    """

    if not isinstance(intelligence, dict):

        return {
            "status": "invalid_input",
            "predictions": [],
            "overall_risk_score": None,
            "overall_risk_level": "unknown",
            "confidence": "low",
            "confidence_score": 0,
            "recommendation": (
                "Insufficient intelligence data is available."
            ),
            "diagnosis": False,
            "engine": {
                "name": ENGINE_NAME,
                "version": ENGINE_VERSION,
                "mode": ENGINE_MODE,
                "diagnosis": False,
            },
        }

    telemetry_count = safe_int(
        intelligence.get("telemetry_count")
    )

    if telemetry_count == 0:

        return {
            "status": "insufficient_data",
            "predictions": [],
            "overall_risk_score": None,
            "overall_risk_level": "unknown",
            "confidence": "low",
            "confidence_score": 0,
            "recommendation": (
                "No telemetry history is available. "
                "Connect the monitoring device and verify telemetry transmission."
            ),
            "diagnosis": False,
            "engine": {
                "name": ENGINE_NAME,
                "version": ENGINE_VERSION,
                "mode": ENGINE_MODE,
                "diagnosis": False,
            },
        }

    current = (
        intelligence.get("current")
        or {}
    )

    temperature = safe_float(
        current.get("temperature")
    )

    heart_rate = safe_float(
        current.get("heart_rate")
    )

    activity = safe_float(
        current.get("activity")
    )

    confidence = calculate_confidence(
        intelligence
    )

    predictions: list[dict[str, Any]] = []

    # Respiratory
    respiratory_score, respiratory_evidence = (
        calculate_respiratory_risk(
            temperature,
            heart_rate,
            activity,
            intelligence,
        )
    )

    predictions.append(
        build_prediction(
            name="respiratory_risk",
            label="Respiratory Pattern Risk",
            score=respiratory_score,
            evidence=respiratory_evidence,
            confidence=confidence,
            recommendation=(
                "Monitor respiratory-related behavioural and physiological "
                "changes closely."
            ),
        )
    )

    # Inflammatory
    inflammatory_score, inflammatory_evidence = (
        calculate_inflammatory_risk(
            temperature,
            intelligence,
        )
    )

    predictions.append(
        build_prediction(
            name="inflammatory_risk",
            label="Inflammatory Pattern Risk",
            score=inflammatory_score,
            evidence=inflammatory_evidence,
            confidence=confidence,
            recommendation=(
                "Monitor temperature and other physiological signals "
                "for continued deviation."
            ),
        )
    )

    # Stress
    stress_score, stress_evidence = (
        calculate_stress_risk(
            heart_rate,
            activity,
            intelligence,
        )
    )

    predictions.append(
        build_prediction(
            name="stress_risk",
            label="Physiological Stress Risk",
            score=stress_score,
            evidence=stress_evidence,
            confidence=confidence,
            recommendation=(
                "Review recent activity and physiological trends "
                "for continued stress-related changes."
            ),
        )
    )

    # Mobility
    mobility_score, mobility_evidence = (
        calculate_mobility_risk(
            activity,
            intelligence,
        )
    )

    predictions.append(
        build_prediction(
            name="mobility_risk",
            label="Mobility Pattern Risk",
            score=mobility_score,
            evidence=mobility_evidence,
            confidence=confidence,
            recommendation=(
                "Monitor movement behaviour and investigate persistent "
                "reductions in activity."
            ),
        )
    )

    # General health
    general_score, general_evidence = (
        calculate_general_health_risk(
            intelligence
        )
    )

    predictions.append(
        build_prediction(
            name="general_health_risk",
            label="General Health Risk",
            score=general_score,
            evidence=general_evidence,
            confidence=confidence,
            recommendation=(
                "Review the complete intelligence assessment and "
                "continue appropriate monitoring."
            ),
        )
    )

    predictions.sort(
        key=lambda item: item["risk_score"],
        reverse=True,
    )

    highest_prediction = predictions[0]

    overall_risk_score = safe_int(
        highest_prediction.get("risk_score")
    )

    overall_risk_level = get_risk_level(
        overall_risk_score
    )

    overall_recommendation = (
        build_prediction_recommendation(
            highest_prediction
        )
    )

    if overall_risk_score >= HIGH_RISK_THRESHOLD:
        status = "action_required"

    elif overall_risk_score >= MODERATE_RISK_THRESHOLD:
        status = "monitor"

    else:
        status = "normal"

    return {
        "status": status,
        "overall_risk_score": overall_risk_score,
        "overall_risk_level": overall_risk_level,
        "confidence": confidence["level"],
        "confidence_score": confidence["score"],
        "predictions": predictions,
        "highest_risk": {
            "prediction": highest_prediction["prediction"],
            "label": highest_prediction["label"],
            "risk_score": highest_prediction["risk_score"],
            "risk_level": highest_prediction["risk_level"],
        },
        "recommendation": overall_recommendation,
        "diagnosis": False,
        "disclaimer": (
            "These results represent operational health-risk patterns "
            "derived from available telemetry. They are not a veterinary "
            "diagnosis."
        ),
        "engine": {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "mode": ENGINE_MODE,
            "diagnosis": False,
        },
    }


# =============================================================================
# BACKWARD COMPATIBILITY
# =============================================================================

predict_animal_disease_risk = predict_animal_health_risks