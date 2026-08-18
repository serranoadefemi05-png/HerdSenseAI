import json
import time

import paho.mqtt.client as mqtt


# ============================================================
# MQTT CONFIGURATION
# ============================================================

BROKER = "localhost"
PORT = 1883
TOPIC = "herdsense/telemetry"


# ============================================================
# TELEMETRY PAYLOAD
# ============================================================

telemetry = {
    "animal_id": 4,
    "temperature": 41.3,
    "heart_rate": 150,
    "activity": 5,
    "battery": 75,
    "latitude": 6.5245,
    "longitude": 3.3793,
}


# ============================================================
# CALLBACKS
# ============================================================

def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties,
):
    if reason_code == 0:

        print("✅ Connected to MQTT Broker")

        result = client.subscribe(TOPIC)

        print(f"📡 Subscribed to: {TOPIC}")
        print(f"📨 Subscribe result: {result}")

    else:

        print(
            f"❌ MQTT connection failed: {reason_code}"
        )


def on_publish(
    client,
    userdata,
    mid,
    reason_code,
    properties,
):
    print(
        f"✅ Telemetry published successfully. "
        f"Message ID: {mid}"
    )


def on_message(
    client,
    userdata,
    message,
):
    payload = message.payload.decode()

    print(
        "📩 MQTT message received:"
    )

    print(payload)


def on_disconnect(
    client,
    userdata,
    disconnect_flags,
    reason_code,
    properties,
):
    print(
        f"🔌 MQTT disconnected: {reason_code}"
    )


# ============================================================
# CREATE MQTT CLIENT
# ============================================================

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2
)


# ============================================================
# REGISTER CALLBACKS
# ============================================================

client.on_connect = on_connect
client.on_publish = on_publish
client.on_message = on_message
client.on_disconnect = on_disconnect


# ============================================================
# CONNECT
# ============================================================

print(
    f"🔄 Connecting to MQTT broker "
    f"{BROKER}:{PORT}..."
)

client.connect(
    BROKER,
    PORT,
    keepalive=60,
)


# ============================================================
# START MQTT NETWORK LOOP
# ============================================================

client.loop_start()


# Give the connection time to establish
time.sleep(2)


# ============================================================
# PUBLISH TELEMETRY
# ============================================================

payload = json.dumps(
    telemetry
)

print()
print("📤 Publishing telemetry:")
print(payload)


result = client.publish(
    TOPIC,
    payload,
    qos=0,
)


if result.rc == mqtt.MQTT_ERR_SUCCESS:

    print(
        "📨 Publish request accepted by MQTT client."
    )

else:

    print(
        f"❌ Publish failed: {result.rc}"
    )


# Give Paho time to send the message
time.sleep(3)


# ============================================================
# CLEAN SHUTDOWN
# ============================================================

client.loop_stop()
client.disconnect()

print()
print("🏁 MQTT test completed.")