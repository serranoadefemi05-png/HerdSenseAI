import hashlib
import json
from typing import Any

from app.core.config import settings


# ============================================================
# HERDSENSE AI — BASE SERVICE
# ============================================================
#
# This service prepares HerdSense records for Base.
#
# IMPORTANT:
# It does NOT duplicate the database.
#
# Existing SQL database:
#
# User
#   ↓
# Farm
#   ↓
# Animal
#   ↓
# Telemetry
#
# Base stores a cryptographic reference/hash representing
# important records.
#
# ============================================================


def create_data_hash(
    data: dict[str, Any]
) -> str:
    """
    Create a deterministic SHA-256 hash from
    HerdSense data.

    The original data remains in the database.

    Base receives the resulting hash.
    """

    normalized_data = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )

    return hashlib.sha256(
        normalized_data.encode("utf-8")
    ).hexdigest()


def build_animal_record(
    animal,
) -> dict[str, Any]:
    """
    Convert the existing SQLAlchemy Animal model
    into the data representation used for
    blockchain verification.
    """

    return {
        "id": animal.id,
        "tag_id": animal.tag_id,
        "name": animal.name,
        "species": animal.species,
        "breed": animal.breed,
        "gender": animal.gender,
        "age": animal.age,
        "weight": animal.weight,
        "health_status": animal.health_status,
        "temperature": animal.temperature,
        "latitude": animal.latitude,
        "longitude": animal.longitude,
        "farm_id": animal.farm_id,
    }


def get_animal_data_hash(
    animal
) -> str:
    """
    Generate a permanent fingerprint of
    the current animal record.
    """

    record = build_animal_record(animal)

    return create_data_hash(record)


def build_telemetry_record(
    telemetry
) -> dict[str, Any]:
    """
    Convert existing telemetry data into
    a deterministic blockchain-verifiable record.
    """

    return {
        "id": telemetry.id,
        "animal_id": telemetry.animal_id,
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude,
        "temperature": telemetry.temperature,
        "heart_rate": telemetry.heart_rate,
        "activity": telemetry.activity,
        "battery": telemetry.battery,
        "timestamp": telemetry.timestamp,
    }


def get_telemetry_data_hash(
    telemetry
) -> str:
    """
    Generate a fingerprint for telemetry.
    """

    record = build_telemetry_record(
        telemetry
    )

    return create_data_hash(record)


def blockchain_configuration() -> dict[str, Any]:
    """
    Return current Base integration state.
    """

    return {
        "network": settings.BASE_NETWORK,
        "chain_id": settings.BASE_CHAIN_ID,
        "rpc_configured": bool(
            settings.BASE_RPC_URL
        ),
        "contract_configured": bool(
            settings.BASE_CONTRACT_ADDRESS
        ),
    }