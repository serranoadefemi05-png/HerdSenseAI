import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
    import.meta.env.VITE_WS_URL ||
    "ws://127.0.0.1:8000/ws/telemetry";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 10000;
const MAX_RECONNECT_EXPONENT = 3;

export default function useTelemetrySocket({
    onTelemetry,
    onHealthUpdate,
    onAlert,
    onAlertStatus,
    onIntelligenceUpdate,
    enabled = true,
} = {}) {
    const socketRef = useRef(null);

    const reconnectTimerRef =
        useRef(null);

    const reconnectAttemptsRef =
        useRef(0);

    const mountedRef =
        useRef(false);

    const [connected, setConnected] =
        useState(false);

    /*
     * ------------------------------------------------------------------------
     * MESSAGE HANDLER
     * ------------------------------------------------------------------------
     */

    const handleMessage = useCallback(
        (event) => {
            try {
                const message =
                    JSON.parse(event.data);

                const eventType =
                    message?.event;

                const data =
                    message?.data ?? message;

                switch (eventType) {
                    case "telemetry":
                        if (onTelemetry) {
                            onTelemetry(data);
                        }
                        break;

                    case "health_update":
                        if (onHealthUpdate) {
                            onHealthUpdate(data);
                        }
                        break;

                    case "alert":
                        if (onAlert) {
                            onAlert(data);
                        }
                        break;

                    case "alert_status":
                        if (onAlertStatus) {
                            onAlertStatus(data);
                        }
                        break;

                    case "intelligence_update":
                    case "intelligence":
                        if (onIntelligenceUpdate) {
                            onIntelligenceUpdate(data);
                        }
                        break;

                    case "connection":
                        console.info(
                            "HerdSense WebSocket connection confirmed"
                        );
                        break;

                    case "pong":
                        break;

                    default:
                        console.debug(
                            "Unknown HerdSense WebSocket event:",
                            eventType
                        );
                        break;
                }
            } catch (error) {
                console.error(
                    "HerdSense WebSocket message parsing error:",
                    error
                );
            }
        },
        [
            onTelemetry,
            onHealthUpdate,
            onAlert,
            onAlertStatus,
            onIntelligenceUpdate,
        ]
    );

    /*
     * ------------------------------------------------------------------------
     * CONNECT
     * ------------------------------------------------------------------------
     */

    const connect = useCallback(() => {
        if (!enabled) {
            return;
        }

        if (!mountedRef.current) {
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

        clearTimeout(
            reconnectTimerRef.current
        );

        reconnectTimerRef.current =
            null;

        try {
            console.info(
                "Connecting to HerdSense WebSocket:",
                WS_URL
            );

            const socket =
                new WebSocket(WS_URL);

            socketRef.current =
                socket;

            /*
             * ---------------------------------------------------------------
             * OPEN
             * ---------------------------------------------------------------
             */

            socket.onopen = () => {
                if (!mountedRef.current) {
                    return;
                }

                console.info(
                    "HerdSense WebSocket connected"
                );

                reconnectAttemptsRef.current =
                    0;

                setConnected(true);
            };

            /*
             * ---------------------------------------------------------------
             * MESSAGE
             * ---------------------------------------------------------------
             */

            socket.onmessage =
                handleMessage;

            /*
             * ---------------------------------------------------------------
             * ERROR
             * ---------------------------------------------------------------
             */

            socket.onerror = (
                error
            ) => {
                if (!mountedRef.current) {
                    return;
                }

                console.error(
                    "HerdSense WebSocket error:",
                    error
                );
            };

            /*
             * ---------------------------------------------------------------
             * CLOSE
             * ---------------------------------------------------------------
             */

            socket.onclose = (
                event
            ) => {
                if (
                    socketRef.current ===
                    socket
                ) {
                    socketRef.current =
                        null;
                }

                setConnected(false);

                if (
                    !mountedRef.current ||
                    !enabled
                ) {
                    return;
                }

                reconnectAttemptsRef.current +=
                    1;

                const exponent =
                    Math.min(
                        reconnectAttemptsRef.current -
                            1,
                        MAX_RECONNECT_EXPONENT
                    );

                const delay =
                    Math.min(
                        INITIAL_RECONNECT_DELAY *
                            2 ** exponent,
                        MAX_RECONNECT_DELAY
                    );

                clearTimeout(
                    reconnectTimerRef.current
                );

                reconnectTimerRef.current =
                    setTimeout(
                        () => {
                            if (
                                mountedRef.current &&
                                enabled
                            ) {
                                connect();
                            }
                        },
                        delay
                    );

                console.warn(
                    `HerdSense WebSocket disconnected ` +
                    `(code ${event.code}). ` +
                    `Reconnecting in ${delay}ms.`
                );
            };
        } catch (error) {
            console.error(
                "HerdSense WebSocket connection failed:",
                error
            );

            setConnected(false);

            if (
                !mountedRef.current ||
                !enabled
            ) {
                return;
            }

            reconnectAttemptsRef.current +=
                1;

            const exponent =
                Math.min(
                    reconnectAttemptsRef.current -
                        1,
                    MAX_RECONNECT_EXPONENT
                );

            const delay =
                Math.min(
                    INITIAL_RECONNECT_DELAY *
                        2 ** exponent,
                    MAX_RECONNECT_DELAY
                );

            clearTimeout(
                reconnectTimerRef.current
            );

            reconnectTimerRef.current =
                setTimeout(
                    () => {
                        if (
                            mountedRef.current &&
                            enabled
                        ) {
                            connect();
                        }
                    },
                    delay
                );
        }
    }, [
        enabled,
        handleMessage,
    ]);

    /*
     * ------------------------------------------------------------------------
     * DISCONNECT
     * ------------------------------------------------------------------------
     */

    const disconnect =
        useCallback(() => {
            clearTimeout(
                reconnectTimerRef.current
            );

            reconnectTimerRef.current =
                null;

            reconnectAttemptsRef.current =
                0;

            const socket =
                socketRef.current;

            if (socket) {
                /*
                 * Remove handlers first so intentional
                 * shutdown does not trigger reconnect.
                 */

                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;

                if (
                    socket.readyState ===
                        WebSocket.OPEN ||
                    socket.readyState ===
                        WebSocket.CONNECTING
                ) {
                    socket.close();
                }
            }

            socketRef.current =
                null;

            setConnected(false);
        }, []);

    /*
     * ------------------------------------------------------------------------
     * LIFECYCLE
     * ------------------------------------------------------------------------
     */

    useEffect(() => {
        mountedRef.current =
            true;

        if (enabled) {
            connect();
        }

        return () => {
            mountedRef.current =
                false;

            disconnect();
        };
    }, [
        enabled,
        connect,
        disconnect,
    ]);

    /*
     * ------------------------------------------------------------------------
     * RETURN API
     * ------------------------------------------------------------------------
     */

    return {
        connected,
        connect,
        disconnect,
    };
}