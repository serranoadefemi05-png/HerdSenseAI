from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.alert import Alert
from app.models.animal import Animal
from app.models.farm import Farm
from app.models.user import User

from app.schemas.alert import (
    AlertResponse,
    AlertResolve,
)

from app.core.dependencies import get_current_user
from app.services.websocket_manager import manager


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"],
)


# ============================================================
# GET ALL ALERTS
# ============================================================

@router.get(
    "/",
    response_model=list[AlertResponse],
)
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    alerts = (
        db.query(Alert)
        .join(Animal)
        .join(Farm)
        .filter(
            Farm.owner_id == current_user.id
        )
        .order_by(
            Alert.timestamp.desc()
        )
        .all()
    )

    return alerts


# ============================================================
# GET SINGLE ALERT
# ============================================================

@router.get(
    "/{alert_id}",
    response_model=AlertResponse,
)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    alert = (
        db.query(Alert)
        .join(Animal)
        .join(Farm)
        .filter(
            Alert.id == alert_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found",
        )

    return alert


# ============================================================
# RESOLVE / REOPEN ALERT
# ============================================================

@router.patch(
    "/{alert_id}/resolve",
    response_model=AlertResponse,
)
async def resolve_alert(
    alert_id: int,
    update: AlertResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # --------------------------------------------------------
    # FIND ALERT BELONGING TO CURRENT USER
    # --------------------------------------------------------

    alert = (
        db.query(Alert)
        .join(Animal)
        .join(Farm)
        .filter(
            Alert.id == alert_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found",
        )

    # --------------------------------------------------------
    # UPDATE STATUS
    # --------------------------------------------------------

    alert.resolved = update.resolved

    db.commit()
    db.refresh(alert)

    # --------------------------------------------------------
    # GET ANIMAL
    # --------------------------------------------------------

    animal = (
        db.query(Animal)
        .filter(
            Animal.id == alert.animal_id
        )
        .first()
    )

    animal_name = (
        animal.name
        if animal
        else f"Animal #{alert.animal_id}"
    )

    # --------------------------------------------------------
    # BUILD REAL-TIME ALERT PAYLOAD
    # --------------------------------------------------------

    alert_payload = {
        "id": alert.id,
        "animal_id": alert.animal_id,
        "animal_name": animal_name,
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

    # --------------------------------------------------------
    # BROADCAST ALERT STATUS UPDATE
    # --------------------------------------------------------

    try:

        await manager.broadcast(
            {
                "event": "alert",
                "data": alert_payload,
            }
        )

    except Exception as error:

        print(
            f"Alert WebSocket broadcast warning: {error}"
        )

    # --------------------------------------------------------
    # BROADCAST SPECIFIC STATUS EVENT
    # --------------------------------------------------------

    try:

        await manager.broadcast(
            {
                "event": "alert_status",
                "data": {
                    "id": alert.id,
                    "animal_id": alert.animal_id,
                    "animal_name": animal_name,
                    "resolved": alert.resolved,
                    "severity": alert.severity,
                    "timestamp": (
                        alert.timestamp.isoformat()
                        if alert.timestamp
                        else None
                    ),
                },
            }
        )

    except Exception as error:

        print(
            f"Alert status WebSocket warning: {error}"
        )

    return alert