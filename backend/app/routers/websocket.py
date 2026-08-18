from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
)

from app.services.websocket_manager import manager


router = APIRouter(
    prefix="/ws",
    tags=["WebSocket"],
)


# ============================================================
# LIVE TELEMETRY WEBSOCKET
# ============================================================

@router.websocket("/telemetry")
async def websocket_endpoint(
    websocket: WebSocket,
):
    """
    Live telemetry WebSocket endpoint.

    Responsibilities:
    - Accept and register the WebSocket connection.
    - Notify the client when the connection is established.
    - Listen for client heartbeat messages.
    - Respond to heartbeat requests.
    - Cleanly remove disconnected clients.
    - Prevent un-awaited coroutine warnings.
    """

    # --------------------------------------------------------
    # CONNECTION
    # --------------------------------------------------------

    await manager.connect(websocket)

    try:

        # ----------------------------------------------------
        # CONNECTION EVENT
        # ----------------------------------------------------

        await websocket.send_json(
            {
                "event": "connection",
                "data": {
                    "status": "connected",
                    "message": (
                        "HerdSense AI live monitoring "
                        "connection established."
                    ),
                },
            }
        )

        # ----------------------------------------------------
        # LISTEN FOR CLIENT MESSAGES
        # ----------------------------------------------------

        while True:

            message = await websocket.receive_text()

            # ------------------------------------------------
            # HEARTBEAT
            # ------------------------------------------------

            if message == "ping":

                await websocket.send_json(
                    {
                        "event": "pong",
                    }
                )

    # ========================================================
    # CLIENT DISCONNECT
    # ========================================================

    except WebSocketDisconnect:

        print(
            "🔌 WebSocket client disconnected."
        )

    # ========================================================
    # CONNECTION ERROR
    # ========================================================

    except Exception as error:

        print(
            f"❌ WebSocket connection error: {error}"
        )

    # ========================================================
    # ALWAYS CLEAN UP CONNECTION
    # ========================================================

    finally:

        try:

            await manager.disconnect(
                websocket
            )

        except Exception as error:

            print(
                f"⚠️ WebSocket cleanup error: {error}"
            )