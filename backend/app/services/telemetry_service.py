from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.animal import Animal
from app.models.telemetry import Telemetry

from app.services.alert_intelligence import (
    synchronize_animal_alerts,
)
from app.services.gps_service import outside_geofence
from app.services.health_analysis import analyze_health
from app.services.websocket_manager import manager


# ============================================================================
# HERDSENSE AI — CANONICAL TELEMETRY PROCESSOR
# ============================================================================
#
# Single telemetry processing pipeline for:
#
# - MQTT hardware
# - REST API
# - Manual telemetry
# - Future device integrations
#
# Pipeline:
#
# telemetry
#     ↓
# persistence
#     ↓
# health analysis
#     ↓
# advanced intelligence
#     ↓
# geofence intelligence
#     ↓
# animal state update
#     ↓
# database commit
#     ↓
# WebSocket synchronization
#
# ============================================================================


# ============================================================================
# CONSTANTS
# ============================================================================

GEOFENCE_ALERT_TYPE = "Geofence"

GEOFENCE_RADIUS_METERS = 500


# ============================================================================
# SERIALIZATION
# ============================================================================

def serialize_alert(
    alert: Alert,
    animal: Animal,
) -> dict:
    """
    Convert an Alert model into the canonical WebSocket payload.
    """

    return {
        "id": alert.id,

        "animal_id": alert.animal_id,

        "animal_name": animal.name,

        "alert_type": alert.alert_type,

        "severity": alert.severity,

        "message": alert.message,

        "resolved": alert.resolved,

        "timestamp": (
            alert.timestamp.isoformat()
            if alert.timestamp
            else None
        ),
    }


def serialize_telemetry(
    telemetry: Telemetry,
    animal: Animal,
    health_status: str | None = None,
    health_analysis: dict | None = None,
) -> dict:
    """
    Convert telemetry into the canonical live telemetry payload.
    """

    analysis = health_analysis or {}

    return {
        "id": telemetry.id,

        "animal_id": animal.id,

        "tag_id": animal.tag_id,

        "animal_name": animal.name,

        # Backward-compatible field.
        "name": animal.name,

        "latitude": telemetry.latitude,

        "longitude": telemetry.longitude,

        "temperature": telemetry.temperature,

        "heart_rate": telemetry.heart_rate,

        "activity": telemetry.activity,

        "battery": telemetry.battery,

        "health_status": (
            health_status
            if health_status is not None
            else animal.health_status
        ),

        "health_score": analysis.get(
            "health_score"
        ),

        "risk_score": analysis.get(
            "risk_score"
        ),

        "risk_level": analysis.get(
            "risk_level"
        ),

        "severity": analysis.get(
            "severity"
        ),

        "reasons": analysis.get(
            "reasons",
            [],
        ),

        "alerts": analysis.get(
            "alerts",
            [],
        ),

        "possible_diseases": analysis.get(
            "possible_diseases",
            [],
        ),

        "recommendations": analysis.get(
            "recommendations",
            [],
        ),

        "timestamp": (
            telemetry.timestamp.isoformat()
            if telemetry.timestamp
            else None
        ),
    }


# ============================================================================
# GEOFENCE HELPERS
# ============================================================================

def get_active_geofence_alert(
    animal_id: int,
    db: Session,
) -> Alert | None:
    """
    Return the current unresolved Geofence alert for an animal.
    """

    return (
        db.query(Alert)
        .filter(
            Alert.animal_id == animal_id,
            Alert.alert_type == GEOFENCE_ALERT_TYPE,
            Alert.resolved == False,
        )
        .order_by(
            Alert.timestamp.desc()
        )
        .first()
    )


def create_or_update_geofence_alert(
    animal: Animal,
    db: Session,
) -> tuple[Alert, bool]:
    """
    Create a Geofence alert if none exists.

    If an unresolved alert already exists, reuse it instead
    of creating duplicates.
    """

    message = (
        "Animal has left the farm boundary."
    )

    existing_alert = get_active_geofence_alert(
        animal_id=animal.id,
        db=db,
    )

    if existing_alert:

        changed = False

        if existing_alert.severity != "High":

            existing_alert.severity = "High"

            changed = True

        if existing_alert.message != message:

            existing_alert.message = message

            changed = True

        return existing_alert, changed

    alert = Alert(
        animal_id=animal.id,
        alert_type=GEOFENCE_ALERT_TYPE,
        severity="High",
        message=message,
        resolved=False,
    )

    db.add(alert)

    db.flush()

    return alert, True


def resolve_geofence_alerts(
    animal_id: int,
    db: Session,
) -> list[Alert]:
    """
    Resolve all active Geofence alerts when the animal
    returns inside the farm boundary.
    """

    active_alerts = (
        db.query(Alert)
        .filter(
            Alert.animal_id == animal_id,
            Alert.alert_type == GEOFENCE_ALERT_TYPE,
            Alert.resolved == False,
        )
        .all()
    )

    resolved_alerts: list[Alert] = []

    for alert in active_alerts:

        alert.resolved = True

        resolved_alerts.append(alert)

    return resolved_alerts


# ============================================================================
# CANONICAL TELEMETRY PROCESSOR
# ============================================================================

async def process_telemetry(
    db: Session,
    animal: Animal,
    telemetry_data,
):
    """
    Process telemetry from every supported source.

    All telemetry sources use this exact pipeline.
    """

    farm = animal.farm

    # ========================================================================
    # SAVE TELEMETRY
    # ========================================================================

    telemetry = Telemetry(
        animal_id=animal.id,

        latitude=telemetry_data.latitude,

        longitude=telemetry_data.longitude,

        temperature=telemetry_data.temperature,

        heart_rate=telemetry_data.heart_rate,

        activity=telemetry_data.activity,

        battery=telemetry_data.battery,
    )

    db.add(telemetry)

    try:

        db.commit()

        db.refresh(telemetry)

    except Exception:

        db.rollback()

        raise

    # ========================================================================
    # HEALTH ANALYSIS
    # ========================================================================

    analysis_result: dict | None = None

    try:

        analysis_result = analyze_health(
            telemetry=telemetry,
            animal=animal,
            db=db,
        )

    except Exception as error:

        print(
            f"[Health Analysis] warning: {error}"
        )

    # ========================================================================
    # HEALTH STATUS
    # ========================================================================

    health_status = (
        analysis_result.get(
            "health_status"
        )
        if analysis_result
        else animal.health_status
    )

    # ========================================================================
    # ADVANCED ALERT INTELLIGENCE
    # ========================================================================

    intelligence_alerts: list[Alert] = []

    try:

        intelligence_alerts = (
            synchronize_animal_alerts(
                telemetry=telemetry,
                animal=animal,
                db=db,
            )
        )

    except Exception as error:

        print(
            f"[Alert Intelligence] warning: {error}"
        )

    # ========================================================================
    # GEOFENCE INTELLIGENCE
    # ========================================================================

    geofence_alert: Alert | None = None

    resolved_geofence_alerts: list[Alert] = []

    geofence_outside = False

    # ------------------------------------------------------------------------
    # CAN EVALUATE GEOFENCE
    # ------------------------------------------------------------------------

    can_evaluate_geofence = (
        farm is not None
        and farm.latitude is not None
        and farm.longitude is not None
        and telemetry.latitude is not None
        and telemetry.longitude is not None
    )

    if can_evaluate_geofence:

        try:

            geofence_outside = outside_geofence(
                current_lat=telemetry.latitude,
                current_lon=telemetry.longitude,
                farm_lat=farm.latitude,
                farm_lon=farm.longitude,
                radius=GEOFENCE_RADIUS_METERS,
            )

            # =================================================================
            # ANIMAL IS OUTSIDE
            # =================================================================

            if geofence_outside:

                geofence_alert, changed = (
                    create_or_update_geofence_alert(
                        animal=animal,
                        db=db,
                    )
                )

                if health_status == "Healthy":

                    animal.health_status = "Warning"

                    health_status = "Warning"

            # =================================================================
            # ANIMAL IS INSIDE
            # =================================================================

            else:

                resolved_geofence_alerts = (
                    resolve_geofence_alerts(
                        animal_id=animal.id,
                        db=db,
                    )
                )

        except Exception as error:

            print(
                f"[Geofence] warning: {error}"
            )

    # ========================================================================
    # UPDATE ANIMAL
    # ========================================================================

    animal.temperature = telemetry.temperature

    animal.latitude = telemetry.latitude

    animal.longitude = telemetry.longitude

    animal.health_status = health_status

    # ========================================================================
    # COMMIT EVERYTHING
    # ========================================================================

    try:

        db.commit()

        db.refresh(telemetry)

        db.refresh(animal)

        if geofence_alert:

            db.refresh(
                geofence_alert
            )

        for alert in intelligence_alerts:

            try:

                db.refresh(alert)

            except Exception:
                pass

        for alert in resolved_geofence_alerts:

            try:

                db.refresh(alert)

            except Exception:
                pass

        if (
            analysis_result
            and analysis_result.get("alert")
        ):

            try:

                db.refresh(
                    analysis_result["alert"]
                )

            except Exception:
                pass

    except Exception:

        db.rollback()

        raise

    # ========================================================================
    # TELEMETRY WEBSOCKET
    # ========================================================================

    telemetry_payload = serialize_telemetry(
        telemetry=telemetry,
        animal=animal,
        health_status=health_status,
        health_analysis=analysis_result,
    )

    try:

        await manager.broadcast(
            {
                "event": "telemetry",
                "data": telemetry_payload,
            }
        )

    except Exception as error:

        print(
            f"[WebSocket] telemetry broadcast warning: {error}"
        )

    # ========================================================================
    # HEALTH UPDATE WEBSOCKET
    # ========================================================================

    if analysis_result:

        health_payload = {
            "animal_id": animal.id,

            "animal_name": animal.name,

            "health_status": (
                analysis_result.get(
                    "health_status"
                )
            ),

            "severity": (
                analysis_result.get(
                    "severity"
                )
            ),

            "health_score": (
                analysis_result.get(
                    "health_score"
                )
            ),

            "risk_score": (
                analysis_result.get(
                    "risk_score"
                )
            ),

            "risk_level": (
                analysis_result.get(
                    "risk_level"
                )
            ),

            "reasons": (
                analysis_result.get(
                    "reasons",
                    [],
                )
            ),

            "timestamp": (
                telemetry.timestamp.isoformat()
                if telemetry.timestamp
                else None
            ),
        }

        try:

            await manager.broadcast(
                {
                    "event": "health_update",
                    "data": health_payload,
                }
            )

        except Exception as error:

            print(
                f"[WebSocket] health broadcast warning: {error}"
            )

    # ========================================================================
    # MAIN HEALTH ALERT
    # ========================================================================

    if analysis_result:

        health_alert = (
            analysis_result.get(
                "alert"
            )
        )

        if health_alert:

            try:

                alert_payload = serialize_alert(
                    alert=health_alert,
                    animal=animal,
                )

                await manager.broadcast(
                    {
                        "event": "alert",
                        "data": alert_payload,
                    }
                )

            except Exception as error:

                print(
                    f"[WebSocket] health alert warning: {error}"
                )

    # ========================================================================
    # ADVANCED INTELLIGENCE ALERTS
    # ========================================================================

    for alert in intelligence_alerts:

        try:

            alert_payload = serialize_alert(
                alert=alert,
                animal=animal,
            )

            await manager.broadcast(
                {
                    "event": "alert",
                    "data": alert_payload,
                }
            )

            await manager.broadcast(
                {
                    "event": "alert_intelligence",
                    "data": alert_payload,
                }
            )

        except Exception as error:

            print(
                f"[WebSocket] intelligence alert warning: {error}"
            )

    # ========================================================================
    # NEW / UPDATED GEOFENCE ALERT
    # ========================================================================

    if geofence_alert:

        try:

            alert_payload = serialize_alert(
                alert=geofence_alert,
                animal=animal,
            )

            await manager.broadcast(
                {
                    "event": "alert",
                    "data": alert_payload,
                }
            )

            await manager.broadcast(
                {
                    "event": "alert_intelligence",
                    "data": alert_payload,
                }
            )

        except Exception as error:

            print(
                f"[WebSocket] geofence alert warning: {error}"
            )

    # ========================================================================
    # RESOLVED GEOFENCE ALERTS
    # ========================================================================

    for alert in resolved_geofence_alerts:

        try:

            alert_payload = serialize_alert(
                alert=alert,
                animal=animal,
            )

            await manager.broadcast(
                {
                    "event": "alert",
                    "data": alert_payload,
                }
            )

            await manager.broadcast(
                {
                    "event": "alert_resolved",
                    "data": alert_payload,
                }
            )

        except Exception as error:

            print(
                f"[WebSocket] geofence resolution warning: {error}"
            )

    # ========================================================================
    # RETURN
    # ========================================================================

    return {
        "telemetry": telemetry,

        "analysis": analysis_result,

        "intelligence_alerts": intelligence_alerts,

        "geofence_alert": geofence_alert,

        "resolved_geofence_alerts": (
            resolved_geofence_alerts
        ),
    }