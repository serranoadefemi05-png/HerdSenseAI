let socket = null;

const WS_URL =
    import.meta.env.VITE_WS_URL ||
    "ws://127.0.0.1:8000/ws/telemetry";

export function connectSocket() {
    // Prevent duplicate connections
    if (
        socket &&
        (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
        )
    ) {
        return socket;
    }

    console.info(
        "Connecting to HerdSense WebSocket:",
        WS_URL
    );

    try {
        socket = new WebSocket(WS_URL);

        socket.onopen = () => {
            console.info(
                "🟢 HerdSense WebSocket Connected"
            );
        };

        socket.onmessage = (event) => {
            try {
                const message =
                    JSON.parse(event.data);

                console.debug(
                    "📡 HerdSense WebSocket message:",
                    message
                );
            } catch (error) {
                console.error(
                    "HerdSense WebSocket message parsing error:",
                    error
                );
            }
        };

        socket.onerror = (error) => {
            console.error(
                "🔴 HerdSense WebSocket Error:",
                error
            );
        };

        socket.onclose = (event) => {
            console.warn(
                `🟠 HerdSense WebSocket Closed. Code: ${event.code}`
            );

            socket = null;
        };

        return socket;
    } catch (error) {
        console.error(
            "❌ Failed to create HerdSense WebSocket:",
            error
        );

        socket = null;

        return null;
    }
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (!socket) {
        return;
    }

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
    ) {
        socket.close();
    }

    socket = null;
}