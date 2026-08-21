/*
|--------------------------------------------------------------------------
| HERDSENSE AI — TELEMETRY WEBSOCKET
|--------------------------------------------------------------------------
| Production-safe WebSocket connection.
|
| Local:
|   ws://127.0.0.1:8000/ws/telemetry
|
| Production:
|   wss://herdsenseai.onrender.com/ws/telemetry
|--------------------------------------------------------------------------
*/

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

/* ==========================================================================
   CONFIGURATION
========================================================================== */

const LOCAL_WS_URL =
    "ws://127.0.0.1:8000/ws/telemetry";

const PRODUCTION_WS_URL =
    "wss://herdsenseai.onrender.com/ws/telemetry";

const configuredWsUrl =
    import.meta.env.VITE_WS_URL;

const DEFAULT_WS_URL =
    import.meta.env.PROD
        ? PRODUCTION_WS_URL
        : LOCAL_WS_URL;

const WS_URL =
    configuredWsUrl?.trim()
        ? configuredWsUrl.trim()
        : DEFAULT_WS_URL;

/*
 * Reconnection settings.
 */

const INITIAL_RECONNECT_DELAY =
    3000;

const MAX_RECONNECT_DELAY =
    30000;

const PING_INTERVAL =
    25000;

/* ==========================================================================
   HOOK
========================================================================== */

export default function useTelemetrySocket(
    onTelemetry
) {
    const socketRef =
        useRef(null);

    const reconnectTimerRef =
        useRef(null);

    const pingTimerRef =
        useRef(null);

    const mountedRef =
        useRef(false);

    const reconnectDelayRef =
        useRef(
            INITIAL_RECONNECT_DELAY
        );

    const connectingRef =
        useRef(false);

    const callbackRef =
        useRef(onTelemetry);

    const [
        connected,
        setConnected,
    ] = useState(false);

    /* ======================================================================
       KEEP CALLBACK CURRENT
    ====================================================================== */

    useEffect(() => {
        callbackRef.current =
            onTelemetry;
    }, [onTelemetry]);

    /* ======================================================================
       CLEAR TIMERS
    ====================================================================== */

    const clearTimers =
        useCallback(() => {
            if (
                reconnectTimerRef.current
            ) {
                clearTimeout(
                    reconnectTimerRef.current
                );

                reconnectTimerRef.current =
                    null;
            }

            if (
                pingTimerRef.current
            ) {
                clearInterval(
                    pingTimerRef.current
                );

                pingTimerRef.current =
                    null;
            }
        }, []);

    /* ======================================================================
       CLOSE SOCKET
    ====================================================================== */

    const closeSocket =
        useCallback(() => {
            const socket =
                socketRef.current;

            if (!socket) {
                return;
            }

            try {
                socket.onopen =
                    null;

                socket.onmessage =
                    null;

                socket.onerror =
                    null;

                socket.onclose =
                    null;

                socket.close();
            } catch (
                error
            ) {
                console.warn(
                    "HerdSense WebSocket close error:",
                    error
                );
            }

            socketRef.current =
                null;
        }, []);

    /* ======================================================================
       CONNECT
    ====================================================================== */

    const connect =
        useCallback(() => {
            if (
                !mountedRef.current
            ) {
                return;
            }

            if (
                connectingRef.current
            ) {
                return;
            }

            const existingSocket =
                socketRef.current;

            if (
                existingSocket &&
                (
                    existingSocket.readyState ===
                        WebSocket.OPEN ||
                    existingSocket.readyState ===
                        WebSocket.CONNECTING
                )
            ) {
                return;
            }

            connectingRef.current =
                true;

            console.log(
                "🔵 Connecting HerdSense live data:",
                WS_URL
            );

            try {
                const socket =
                    new WebSocket(
                        WS_URL
                    );

                socketRef.current =
                    socket;

                socket.onopen =
                    () => {
                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }

                        connectingRef.current =
                            false;

                        reconnectDelayRef.current =
                            INITIAL_RECONNECT_DELAY;

                        setConnected(
                            true
                        );

                        console.log(
                            "🟢 HerdSense live data connected"
                        );

                        /*
                         * Keep connection alive.
                         */

                        if (
                            pingTimerRef.current
                        ) {
                            clearInterval(
                                pingTimerRef.current
                            );
                        }

                        pingTimerRef.current =
                            setInterval(
                                () => {
                                    const activeSocket =
                                        socketRef.current;

                                    if (
                                        activeSocket &&
                                        activeSocket.readyState ===
                                            WebSocket.OPEN
                                    ) {
                                        try {
                                            activeSocket.send(
                                                JSON.stringify(
                                                    {
                                                        event:
                                                            "ping",
                                                    }
                                                )
                                            );
                                        } catch (
                                            error
                                        ) {
                                            console.warn(
                                                "HerdSense WebSocket ping failed:",
                                                error
                                            );
                                        }
                                    }
                                },
                                PING_INTERVAL
                            );
                    };

                socket.onmessage =
                    (event) => {
                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }

                        let payload =
                            event.data;

                        try {
                            payload =
                                JSON.parse(
                                    event.data
                                );
                        } catch {
                            /*
                             * Non-JSON WebSocket
                             * messages are allowed.
                             */
                        }

                        console.log(
                            "📡 HerdSense live event:",
                            payload
                        );

                        /*
                         * Ignore heartbeat messages.
                         */

                        if (
                            payload &&
                            typeof payload ===
                                "object" &&
                            (
                                payload.event ===
                                    "pong" ||
                                payload.type ===
                                    "pong"
                            )
                        ) {
                            return;
                        }

                        /*
                         * Some backends wrap telemetry
                         * inside `data`.
                         */

                        const telemetry =
                            payload?.telemetry ??
                            payload?.data ??
                            payload;

                        /*
                         * Forward only useful
                         * telemetry objects.
                         */

                        if (
                            telemetry &&
                            typeof telemetry ===
                                "object"
                        ) {
                            const animalId =
                                telemetry?.animal_id ??
                                telemetry?.animalId ??
                                telemetry?.animal?.id ??
                                telemetry?.tag_id ??
                                telemetry?.tagId;

                            if (
                                animalId !==
                                    undefined &&
                                animalId !==
                                    null
                            ) {
                                callbackRef.current?.(
                                    telemetry
                                );
                            }
                        }
                    };

                socket.onerror =
                    (error) => {
                        console.error(
                            "🔴 HerdSense WebSocket error:",
                            error
                        );

                        setConnected(
                            false
                        );
                    };

                socket.onclose =
                    (event) => {
                        connectingRef.current =
                            false;

                        if (
                            pingTimerRef.current
                        ) {
                            clearInterval(
                                pingTimerRef.current
                            );

                            pingTimerRef.current =
                                null;
                        }

                        if (
                            socketRef.current ===
                            socket
                        ) {
                            socketRef.current =
                                null;
                        }

                        setConnected(
                            false
                        );

                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }

                        console.warn(
                            "🔌 HerdSense live monitoring disconnected:",
                            event?.code,
                            event?.reason
                        );

                        const delay =
                            reconnectDelayRef.current;

                        reconnectDelayRef.current =
                            Math.min(
                                delay * 2,
                                MAX_RECONNECT_DELAY
                            );

                        reconnectTimerRef.current =
                            setTimeout(
                                () => {
                                    connect();
                                },
                                delay
                            );
                    };
            } catch (
                error
            ) {
                connectingRef.current =
                    false;

                setConnected(
                    false
                );

                console.error(
                    "HerdSense WebSocket connection failed:",
                    error
                );

                if (
                    mountedRef.current
                ) {
                    const delay =
                        reconnectDelayRef.current;

                    reconnectDelayRef.current =
                        Math.min(
                            delay * 2,
                            MAX_RECONNECT_DELAY
                        );

                    reconnectTimerRef.current =
                        setTimeout(
                            () => {
                                connect();
                            },
                            delay
                        );
                }
            }
        }, []);

    /* ======================================================================
       LIFECYCLE
    ====================================================================== */

    useEffect(() => {
        mountedRef.current =
            true;

        connect();

        return () => {
            mountedRef.current =
                false;

            clearTimers();

            closeSocket();

            setConnected(
                false
            );
        };
    }, [
        connect,
        clearTimers,
        closeSocket,
    ]);

    /* ======================================================================
       RETURN
    ====================================================================== */

    return {
        connected,
        reconnect: connect,
        url: WS_URL,
    };
}