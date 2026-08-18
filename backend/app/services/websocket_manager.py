from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket


logger = logging.getLogger("herdsense.websocket")


class ConnectionManager:
    """
    Production WebSocket connection manager for HerdSense AI.

    Responsibilities:
    - Accept and track live connections
    - Safely remove disconnected clients
    - Send personal events
    - Broadcast real-time events
    - Prevent one failed connection from interrupting others
    - Avoid concurrent writes to the same WebSocket
    - Expose connection statistics
    """

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

        # A lock protects connection registration/removal.
        self._connections_lock = asyncio.Lock()

        # Each socket gets its own send lock so multiple async tasks
        # cannot attempt to write to the same WebSocket simultaneously.
        self._send_locks: dict[WebSocket, asyncio.Lock] = {}

    # ========================================================================
    # CONNECT
    # ========================================================================

    async def connect(
        self,
        websocket: WebSocket,
    ) -> None:
        """
        Accept and register a WebSocket connection.
        """

        await websocket.accept()

        async with self._connections_lock:
            self.active_connections.add(websocket)

            if websocket not in self._send_locks:
                self._send_locks[websocket] = asyncio.Lock()

        logger.info(
            "WebSocket connected | active_connections=%s",
            self.connection_count(),
        )

    # ========================================================================
    # DISCONNECT
    # ========================================================================

    async def disconnect(
        self,
        websocket: WebSocket,
    ) -> None:
        """
        Safely remove a WebSocket connection.
        """

        async with self._connections_lock:
            self.active_connections.discard(websocket)
            self._send_locks.pop(websocket, None)

        logger.info(
            "WebSocket disconnected | active_connections=%s",
            self.connection_count(),
        )

    # ========================================================================
    # SEND TO ONE CONNECTION
    # ========================================================================

    async def send_personal_message(
        self,
        data: dict[str, Any],
        websocket: WebSocket,
    ) -> bool:
        """
        Send an event to a single connected client.

        Returns:
            True  -> message delivered
            False -> connection failed
        """

        if websocket not in self.active_connections:
            return False

        send_lock = self._send_locks.get(websocket)

        if send_lock is None:
            return False

        try:
            async with send_lock:
                await websocket.send_json(data)

            return True

        except Exception as exc:
            logger.warning(
                "WebSocket personal send failed: %s",
                exc,
            )

            await self.disconnect(websocket)

            return False

    # ========================================================================
    # BROADCAST
    # ========================================================================

    async def broadcast(
        self,
        data: dict[str, Any],
    ) -> int:
        """
        Broadcast an event to every currently connected client.

        Returns:
            Number of successful deliveries.
        """

        async with self._connections_lock:
            connections = list(self.active_connections)

        if not connections:
            return 0

        async def send_to_connection(
            websocket: WebSocket,
        ) -> tuple[WebSocket, bool]:
            success = await self.send_personal_message(
                data=data,
                websocket=websocket,
            )

            return websocket, success

        results = await asyncio.gather(
            *(
                send_to_connection(connection)
                for connection in connections
            ),
            return_exceptions=False,
        )

        successful = sum(
            1
            for _, success in results
            if success
        )

        logger.debug(
            "WebSocket broadcast | event=%s | delivered=%s | connected=%s",
            data.get("event"),
            successful,
            len(connections),
        )

        return successful

    # ========================================================================
    # BROADCAST TO CONNECTIONS MATCHING A FILTER
    # ========================================================================

    async def broadcast_filtered(
        self,
        data: dict[str, Any],
        predicate,
    ) -> int:
        """
        Broadcast an event only to connections accepted by predicate.

        This gives us a foundation for future farm/user-specific channels
        without changing the core manager.

        predicate:
            callable(WebSocket) -> bool
        """

        async with self._connections_lock:
            connections = [
                connection
                for connection in self.active_connections
                if predicate(connection)
            ]

        if not connections:
            return 0

        results = await asyncio.gather(
            *(
                self.send_personal_message(
                    data=data,
                    websocket=connection,
                )
                for connection in connections
            ),
            return_exceptions=False,
        )

        return sum(
            1
            for success in results
            if success
        )

    # ========================================================================
    # CONNECTION COUNT
    # ========================================================================

    def connection_count(self) -> int:
        """
        Return the number of currently registered connections.
        """

        return len(self.active_connections)

    # ========================================================================
    # CONNECTION STATUS
    # ========================================================================

    def is_connected(
        self,
        websocket: WebSocket,
    ) -> bool:
        """
        Determine whether a WebSocket is currently registered.
        """

        return websocket in self.active_connections

    # ========================================================================
    # SERVER STATUS
    # ========================================================================

    def status(self) -> dict[str, Any]:
        """
        Return operational WebSocket manager status.
        """

        return {
            "status": "online",
            "active_connections": self.connection_count(),
        }


# ============================================================================
# GLOBAL CONNECTION MANAGER
# ============================================================================

manager = ConnectionManager()