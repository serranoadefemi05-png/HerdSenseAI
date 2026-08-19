import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";


/*
 * ============================================================================
 * HERDSENSE AI — LIVE DATA CONTEXT
 * ============================================================================
 *
 * LOCAL DEVELOPMENT
 *   ws://127.0.0.1:8000/ws/telemetry
 *
 * PRODUCTION
 *   wss://herdsenseai.onrender.com/ws/telemetry
 *
 * Vite override:
 *
 *   VITE_WS_URL
 *
 * ============================================================================
 */


/*
 * ============================================================================
 * WEBSOCKET URL
 * ============================================================================
 */

const DEFAULT_WS_URL =
    window.location.protocol === "https:"
        ? "wss://herdsenseai.onrender.com/ws/telemetry"
        : "ws://127.0.0.1:8000/ws/telemetry";


const WS_URL =
    import.meta.env.VITE_WS_URL ||
    DEFAULT_WS_URL;


console.log(
    "[HerdSense AI] WebSocket URL:",
    WS_URL
);


/*
 * ============================================================================
 * RECONNECTION CONFIGURATION
 * ============================================================================
 */

const INITIAL_RECONNECT_DELAY =
    1000;

const MAX_RECONNECT_DELAY =
    10000;

const MAX_RECONNECT_EXPONENT =
    3;


/*
 * ============================================================================
 * CONTEXT
 * ============================================================================
 */

const LiveDataContext =
    createContext(null);


/*
 * ============================================================================
 * PROVIDER
 * ============================================================================
 */

export function LiveDataProvider({
    children,
}) {

    const socketRef =
        useRef(null);

    const reconnectTimerRef =
        useRef(null);

    const heartbeatTimerRef =
        useRef(null);

    const mountedRef =
        useRef(false);

    const reconnectAttemptsRef =
        useRef(0);


    /*
     * ========================================================================
     * CONNECTION STATE
     * ========================================================================
     */

    const [
        connected,
        setConnected,
    ] = useState(false);


    /*
     * ========================================================================
     * LIVE DATA
     * ========================================================================
     */

    const [
        latestTelemetry,
        setLatestTelemetry,
    ] = useState(null);

    const [
        latestHealthUpdate,
        setLatestHealthUpdate,
    ] = useState(null);

    const [
        latestAlert,
        setLatestAlert,
    ] = useState(null);

    const [
        latestAlertStatus,
        setLatestAlertStatus,
    ] = useState(null);

    const [
        latestIntelligence,
        setLatestIntelligence,
    ] = useState(null);


    /*
     * ========================================================================
     * CLEAR TIMERS
     * ========================================================================
     */

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
                heartbeatTimerRef.current
            ) {

                clearInterval(
                    heartbeatTimerRef.current
                );

                heartbeatTimerRef.current =
                    null;
            }

        }, []);


    /*
     * ========================================================================
     * CALCULATE RECONNECT DELAY
     * ========================================================================
     */

    const getReconnectDelay =
        useCallback(() => {

            const exponent =
                Math.min(
                    reconnectAttemptsRef.current,
                    MAX_RECONNECT_EXPONENT
                );


            return Math.min(
                INITIAL_RECONNECT_DELAY *
                    2 ** exponent,

                MAX_RECONNECT_DELAY
            );

        }, []);


    /*
     * ========================================================================
     * CONNECT
     * ========================================================================
     */

    const connect =
        useCallback(() => {

            if (
                !mountedRef.current
            ) {
                return;
            }


            const existingSocket =
                socketRef.current;


            /*
             * Prevent duplicate sockets.
             */

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


            clearTimers();


            console.info(
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


                /*
                 * =================================================================
                 * OPEN
                 * =================================================================
                 */

                socket.onopen =
                    () => {

                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }


                        console.info(
                            "🟢 HerdSense live data connected"
                        );


                        reconnectAttemptsRef.current =
                            0;


                        setConnected(
                            true
                        );


                        /*
                         * HEARTBEAT
                         */

                        if (
                            heartbeatTimerRef.current
                        ) {

                            clearInterval(
                                heartbeatTimerRef.current
                            );

                        }


                        heartbeatTimerRef.current =
                            setInterval(
                                () => {

                                    if (
                                        socket.readyState ===
                                        WebSocket.OPEN
                                    ) {

                                        try {

                                            socket.send(
                                                "ping"
                                            );

                                        } catch (
                                            error
                                        ) {

                                            console.error(
                                                "❌ HerdSense heartbeat error:",
                                                error
                                            );

                                        }

                                    }

                                },

                                30000
                            );

                    };


                /*
                 * =================================================================
                 * MESSAGE
                 * =================================================================
                 */

                socket.onmessage =
                    (event) => {

                        try {

                            const message =
                                JSON.parse(
                                    event.data
                                );


                            console.log(
                                "📡 HerdSense live event:",
                                message
                            );


                            const eventType =
                                message?.event;


                            const data =
                                message?.data ??
                                message;


                            /*
                             * CONNECTION
                             */

                            if (
                                eventType ===
                                "connection"
                            ) {

                                console.info(
                                    "🔌 HerdSense live monitoring connected"
                                );

                                return;

                            }


                            /*
                             * PONG
                             */

                            if (
                                eventType ===
                                "pong"
                            ) {

                                return;

                            }


                            /*
                             * TELEMETRY
                             */

                            if (
                                eventType ===
                                "telemetry"
                            ) {

                                setLatestTelemetry(
                                    data
                                );

                                return;

                            }


                            /*
                             * HEALTH UPDATE
                             */

                            if (
                                eventType ===
                                "health_update"
                            ) {

                                setLatestHealthUpdate(
                                    data
                                );

                                return;

                            }


                            /*
                             * ALERT
                             */

                            if (
                                eventType ===
                                "alert"
                            ) {

                                setLatestAlert(
                                    data
                                );

                                return;

                            }


                            /*
                             * ALERT STATUS
                             */

                            if (
                                eventType ===
                                "alert_status"
                            ) {

                                setLatestAlertStatus(
                                    data
                                );

                                return;

                            }


                            /*
                             * INTELLIGENCE
                             */

                            if (
                                eventType ===
                                    "intelligence_update" ||

                                eventType ===
                                    "intelligence"
                            ) {

                                setLatestIntelligence(
                                    data
                                );

                                return;

                            }


                            /*
                             * UNKNOWN EVENT
                             */

                            console.debug(
                                "ℹ️ Unknown HerdSense live event:",
                                eventType
                            );

                        } catch (
                            error
                        ) {

                            console.error(
                                "❌ Live event parsing error:",
                                error
                            );

                        }

                    };


                /*
                 * =================================================================
                 * ERROR
                 * =================================================================
                 */

                socket.onerror =
                    (error) => {

                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }


                        console.error(
                            "🔴 HerdSense live data error:",
                            error
                        );

                    };


                /*
                 * =================================================================
                 * CLOSE
                 * =================================================================
                 */

                socket.onclose =
                    (event) => {

                        clearTimers();


                        if (
                            socketRef.current ===
                            socket
                        ) {

                            socketRef.current =
                                null;

                        }


                        if (
                            !mountedRef.current
                        ) {
                            return;
                        }


                        setConnected(
                            false
                        );


                        reconnectAttemptsRef.current +=
                            1;


                        const delay =
                            getReconnectDelay();


                        console.warn(
                            `🟠 HerdSense live data disconnected. ` +
                            `Code: ${event.code}. ` +
                            `Reconnecting in ${delay}ms.`
                        );


                        reconnectTimerRef.current =
                            setTimeout(
                                () => {

                                    if (
                                        mountedRef.current
                                    ) {

                                        connect();

                                    }

                                },

                                delay
                            );

                    };

            } catch (
                error
            ) {

                console.error(
                    "❌ HerdSense WebSocket connection failed:",
                    error
                );


                setConnected(
                    false
                );


                if (
                    !mountedRef.current
                ) {
                    return;
                }


                reconnectAttemptsRef.current +=
                    1;


                const delay =
                    getReconnectDelay();


                reconnectTimerRef.current =
                    setTimeout(
                        () => {

                            if (
                                mountedRef.current
                            ) {

                                connect();

                            }

                        },

                        delay
                    );

            }

        }, [
            clearTimers,
            getReconnectDelay,
        ]);


    /*
     * ========================================================================
     * START CONNECTION
     * ========================================================================
     */

    useEffect(() => {

        mountedRef.current =
            true;


        connect();


        return () => {

            mountedRef.current =
                false;


            clearTimers();


            const socket =
                socketRef.current;


            if (
                socket
            ) {

                socket.onopen =
                    null;

                socket.onmessage =
                    null;

                socket.onerror =
                    null;

                socket.onclose =
                    null;


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


            setConnected(
                false
            );

        };

    }, [
        connect,
        clearTimers,
    ]);


    /*
     * ========================================================================
     * CONTEXT VALUE
     * ========================================================================
     */

    const value =
        useMemo(() => {

            return {

                connected,

                latestTelemetry,

                latestHealthUpdate,

                latestAlert,

                latestAlertStatus,

                latestIntelligence,

            };

        }, [

            connected,

            latestTelemetry,

            latestHealthUpdate,

            latestAlert,

            latestAlertStatus,

            latestIntelligence,

        ]);


    /*
     * ========================================================================
     * PROVIDER
     * ========================================================================
     */

    return (

        <LiveDataContext.Provider
            value={value}
        >

            {children}

        </LiveDataContext.Provider>

    );

}


/*
 * ============================================================================
 * HOOK
 * ============================================================================
 */

export function useLiveData() {

    const context =
        useContext(
            LiveDataContext
        );


    if (
        !context
    ) {

        throw new Error(
            "useLiveData must be used inside LiveDataProvider"
        );

    }


    return context;

}