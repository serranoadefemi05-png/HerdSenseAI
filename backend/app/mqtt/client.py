import asyncio
import json

import paho.mqtt.client as mqtt
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.animal import Animal
from app.schemas.telemetry import TelemetryCreate
from app.services.telemetry_service import process_telemetry


# ============================================================
# MQTT CONFIGURATION
# ============================================================

BROKER = "localhost"
PORT = 1883
TOPIC = "herdsense/telemetry"


# ============================================================
# EVENT LOOP REFERENCE
# ============================================================

_event_loop = None


# ============================================================
# MQTT CONNECT
# ============================================================

def on_connect(
    client,
    userdata,
    flags,
    reason_code,
    properties=None,
):
    if reason_code == 0:

        print("✅ Connected to MQTT Broker")

        result = client.subscribe(TOPIC)

        print(
            f"📡 Subscribed to MQTT topic: {TOPIC}"
        )

        print(
            f"📨 Subscribe result: {result}"
        )

    else:

        print(
            f"❌ MQTT connection failed. "
            f"Reason code: {reason_code}"
        )


# ============================================================
# PROCESS MQTT TELEMETRY
# ============================================================

async def process_mqtt_message(
    data: dict,
):
    db: Session = SessionLocal()

    try:

        # ----------------------------------------------------
        # VALIDATE MESSAGE
        # ----------------------------------------------------

        telemetry_data = TelemetryCreate(
            animal_id=data["animal_id"],
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            temperature=data.get("temperature"),
            heart_rate=data.get("heart_rate"),
            activity=data.get("activity"),
            battery=data.get("battery"),
        )

        # ----------------------------------------------------
        # FIND ANIMAL
        # ----------------------------------------------------

        animal = (
            db.query(Animal)
            .filter(
                Animal.id == telemetry_data.animal_id
            )
            .first()
        )

        if animal is None:

            print(
                "❌ MQTT telemetry rejected: "
                f"Animal #{telemetry_data.animal_id} "
                "does not exist."
            )

            return

        # ----------------------------------------------------
        # PROCESS TELEMETRY
        # ----------------------------------------------------

        result = await process_telemetry(
            db=db,
            animal=animal,
            telemetry_data=telemetry_data,
        )

        # ----------------------------------------------------
        # LOG RESULT
        # ----------------------------------------------------

        analysis = result["analysis"]

        print(
            "✅ MQTT telemetry processed successfully"
        )

        print(
            f"🐄 Animal: #{animal.id} "
            f"{animal.name}"
        )

        print(
            f"🌡️ Temperature: "
            f"{telemetry_data.temperature}"
        )

        print(
            f"❤️ Heart rate: "
            f"{telemetry_data.heart_rate}"
        )

        print(
            f"🏃 Activity: "
            f"{telemetry_data.activity}"
        )

        print(
            f"🔋 Battery: "
            f"{telemetry_data.battery}"
        )

        print(
            f"🧠 Health status: "
            f"{analysis['health_status']}"
        )

        print(
            f"📊 Health score: "
            f"{analysis['health_score']}"
        )

        if analysis["alerts"]:

            print(
                "🚨 Alerts:"
            )

            for alert in analysis["alerts"]:

                print(
                    f"   ⚠ {alert}"
                )

        print(
            "📡 Telemetry broadcast to "
            "connected WebSocket clients."
        )

    except KeyError as error:

        print(
            f"❌ MQTT message missing required field: "
            f"{error}"
        )

        db.rollback()

    except Exception as error:

        print(
            f"❌ MQTT telemetry processing error: "
            f"{error}"
        )

        db.rollback()

    finally:

        db.close()


# ============================================================
# MQTT MESSAGE
# ============================================================

def on_message(
    client,
    userdata,
    msg,
):
    payload = msg.payload.decode(
        "utf-8"
    )

    print(
        "📩 Incoming MQTT Message"
    )

    print(payload)

    try:

        data = json.loads(payload)

        print(
            "🧾 Parsed MQTT telemetry:"
        )

        print(data)

    except json.JSONDecodeError:

        print(
            "❌ Invalid JSON received from MQTT."
        )

        return

    # --------------------------------------------------------
    # SEND PROCESSING TO FASTAPI EVENT LOOP
    # --------------------------------------------------------

    if _event_loop is None:

        print(
            "❌ FastAPI event loop is not available."
        )

        return

    try:

        future = asyncio.run_coroutine_threadsafe(
            process_mqtt_message(data),
            _event_loop,
        )

        future.add_done_callback(
            mqtt_processing_complete
        )

    except Exception as error:

        print(
            "❌ Failed to schedule MQTT "
            f"telemetry processing: {error}"
        )


# ============================================================
# MQTT PROCESSING CALLBACK
# ============================================================

def mqtt_processing_complete(
    future,
):
    try:

        future.result()

    except Exception as error:

        print(
            "❌ MQTT background processing failed:"
        )

        print(error)


# ============================================================
# MQTT DISCONNECT
# ============================================================

def on_disconnect(
    client,
    userdata,
    disconnect_flags=None,
    reason_code=None,
    properties=None,
):
    print(
        "🔌 MQTT disconnected."
    )

    if reason_code is not None:

        print(
            f"Reason code: {reason_code}"
        )


# ============================================================
# MQTT CLIENT
# ============================================================

client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2
)

client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect


# ============================================================
# START MQTT
# ============================================================

def start_mqtt():

    global _event_loop

    try:

        _event_loop = asyncio.get_running_loop()

    except RuntimeError:

        print(
            "❌ Could not obtain FastAPI event loop."
        )

        return

    print(
        f"🔄 Connecting to MQTT broker "
        f"{BROKER}:{PORT}..."
    )

    try:

        client.connect(
            BROKER,
            PORT,
            keepalive=60,
        )

        client.loop_start()

    except Exception as error:

        print(
            f"❌ MQTT startup failed: {error}"
        )


# ============================================================
# STOP MQTT
# ============================================================

def stop_mqtt():

    try:

        client.loop_stop()

        client.disconnect()

        print(
            "🛑 MQTT client stopped."

        )

    except Exception as error:

        print(
            f"⚠️ MQTT shutdown error: {error}"
        )