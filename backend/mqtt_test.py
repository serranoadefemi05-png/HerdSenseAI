import json
import time
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "herdsense/telemetry"

payload = {
    "animal_id": 4,
    "temperature": 41.3,
    "heart_rate": 150,
    "activity": 5,
    "battery": 75,
    "latitude": 6.5245,
    "longitude": 3.3793,
}


client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2
)

print("🔌 Connecting to MQTT broker...")

client.connect(
    BROKER,
    PORT,
    keepalive=60,
)

client.loop_start()

time.sleep(1)

message = json.dumps(payload)

print("📡 Publishing telemetry...")
print(message)

result = client.publish(
    TOPIC,
    message,
)

result.wait_for_publish()

print("✅ Telemetry published successfully")

time.sleep(2)

client.loop_stop()
client.disconnect()

print("🔌 MQTT client disconnected")