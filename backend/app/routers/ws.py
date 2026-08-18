from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import manager


router = APIRouter()


# ============================================================================
# HERDSENSE AI — LIVE WEBSOCKET ENDPOINT
# ============================================================================
#
# Provides the persistent real-time channel used by the frontend for:
#
# - telemetry
# - health updates
# - alerts
# - alert status changes
# - intelligence updates
#
# Authentication/authorization can be enforced at the manager layer or added
# to this endpoint when the production authentication strategy is finalized.
# ============================================================================


@router.websocket("/ws/live")
async def websocket_endpoint(
    websocket: WebSocket,
) -> None:
    """
    Maintain a persistent HerdSense AI live-data connection.
    """

    await manager.connect(websocket)

    try:
        while True:
            # The client may send heartbeat/control messages.
            # Server-originated events are broadcast through the manager.
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)

    except Exception:
        manager.disconnect(websocket)