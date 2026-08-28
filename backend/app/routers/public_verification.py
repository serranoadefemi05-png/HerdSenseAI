from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.animal import Animal
from app.models.farm import Farm
from app.models.telemetry import Telemetry

from app.services.base_service import (
    blockchain_configuration,
    get_animal_data_hash,
    get_telemetry_data_hash,
    get_web3,
    get_contract,
)


# ============================================================================
# ROUTER
# ============================================================================


router = APIRouter(
    prefix="/api/v1/public",
    tags=["Public Verification"],
)


# ============================================================================
# HELPERS
# ============================================================================


def _hash_to_string(
    value,
) -> str:

    if hasattr(
        value,
        "hex",
    ):
        return value.hex()

    return str(
        value
    )


def _datetime_to_iso(
    value,
):

    if value is None:
        return None

    return value.isoformat()


# ============================================================================
# PUBLIC ANIMAL DIGITAL PASSPORT
# ============================================================================


@router.get(
    "/verify/animal/{animal_id}"
)
def verify_public_animal(
    animal_id: int,

    db: Session = Depends(
        get_db
    ),
):
    """
    Public animal verification endpoint.

    Designed for:

    - QR-code scanning
    - Farmers
    - Buyers
    - Veterinarians
    - Inspectors
    - Supply-chain partners
    - Non-Web3 users

    No authentication is required.

    Sensitive account information is not exposed.
    """

    # ========================================================================
    # FIND ANIMAL
    # ========================================================================

    animal = (
        db.query(
            Animal
        )
        .filter(
            Animal.id == animal_id
        )
        .first()
    )

    if not animal:

        raise HTTPException(
            status_code=404,

            detail=(
                "Animal record not found."
            ),
        )

    # ========================================================================
    # FARM
    # ========================================================================

    farm = (
        db.query(
            Farm
        )
        .filter(
            Farm.id == animal.farm_id
        )
        .first()
    )

    # ========================================================================
    # LATEST TELEMETRY
    # ========================================================================

    latest_telemetry = (
        db.query(
            Telemetry
        )
        .filter(
            Telemetry.animal_id
            == animal.id
        )
        .order_by(
            Telemetry.timestamp.desc()
        )
        .first()
    )

    # ========================================================================
    # LOCAL ANIMAL HASH
    # ========================================================================

    local_animal_hash = (
        get_animal_data_hash(
            animal
        )
    )

    # ========================================================================
    # BLOCKCHAIN VERIFICATION
    # ========================================================================

    try:

        web3 = get_web3()

        contract = get_contract(
            web3
        )

        # --------------------------------------------------------------------
        # ON-CHAIN ANIMAL RECORD
        # --------------------------------------------------------------------

        onchain_animal = (
            contract.functions
            .getAnimalRecord(
                animal.id
            )
            .call()
        )

        animal_exists_onchain = bool(
            onchain_animal[5]
        )

        animal_verified = False

        if animal_exists_onchain:

            animal_verified = bool(
                contract.functions
                .verifyAnimal(
                    animal.id,

                    bytes.fromhex(
                        local_animal_hash
                    ),
                )
                .call()
            )

        # --------------------------------------------------------------------
        # LATEST TELEMETRY VERIFICATION
        # --------------------------------------------------------------------

        telemetry_verified = None

        telemetry_proof = None

        if latest_telemetry:

            local_telemetry_hash = (
                get_telemetry_data_hash(
                    latest_telemetry
                )
            )

            onchain_telemetry = (
                contract.functions
                .getTelemetryRecord(
                    latest_telemetry.id
                )
                .call()
            )

            telemetry_exists_onchain = bool(
                onchain_telemetry[5]
            )

            if telemetry_exists_onchain:

                telemetry_verified = bool(
                    contract.functions
                    .verifyTelemetry(
                        latest_telemetry.id,

                        bytes.fromhex(
                            local_telemetry_hash
                        ),
                    )
                    .call()
                )

                telemetry_proof = {
                    "telemetry_id": (
                        latest_telemetry.id
                    ),

                    "verified": (
                        telemetry_verified
                    ),

                    "data_hash": (
                        local_telemetry_hash
                    ),

                    "onchain_hash": (
                        _hash_to_string(
                            onchain_telemetry[2]
                        )
                    ),

                    "anchored_by": (
                        onchain_telemetry[3]
                    ),

                    "anchored_at": (
                        onchain_telemetry[4]
                    ),
                }

        # --------------------------------------------------------------------
        # BLOCKCHAIN STATUS
        # --------------------------------------------------------------------

        if animal_verified:

            blockchain_status = "verified"

        elif animal_exists_onchain:

            blockchain_status = "registered"

        else:

            blockchain_status = (
                "not_registered"
            )

        # --------------------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------------------

        return {
            "verified": (
                animal_verified
            ),

            "status": (
                "verified"
                if animal_verified
                else "verification_required"
            ),

            "blockchain": {
                "name": "Base",

                "network": (
                    settings.BASE_NETWORK
                ),

                "chain_id": (
                    settings.BASE_CHAIN_ID
                ),

                "status": (
                    blockchain_status
                ),

                "contract": (
                    settings.BASE_CONTRACT_ADDRESS
                ),
            },

            # =================================================================
            # HUMAN-READABLE ANIMAL PROFILE
            # =================================================================

            "animal": {
                "id": animal.id,

                "tag_id": animal.tag_id,

                "name": animal.name,

                "species": animal.species,

                "breed": animal.breed,

                "gender": animal.gender,

                "age": animal.age,

                "weight": animal.weight,

                "health_status": (
                    animal.health_status
                ),

                "temperature": (
                    animal.temperature
                ),

                "latitude": (
                    animal.latitude
                ),

                "longitude": (
                    animal.longitude
                ),

                "farm": (
                    {
                        "id": farm.id,

                        "name": getattr(
                            farm,
                            "name",
                            None,
                        ),
                    }
                    if farm
                    else None
                ),
            },

            # =================================================================
            # LATEST HEALTH / TELEMETRY SNAPSHOT
            # =================================================================

            "latest_telemetry": (
                {
                    "id": (
                        latest_telemetry.id
                    ),

                    "temperature": (
                        latest_telemetry.temperature
                    ),

                    "heart_rate": (
                        latest_telemetry.heart_rate
                    ),

                    "activity": (
                        latest_telemetry.activity
                    ),

                    "battery": (
                        latest_telemetry.battery
                    ),

                    "latitude": (
                        latest_telemetry.latitude
                    ),

                    "longitude": (
                        latest_telemetry.longitude
                    ),

                    "timestamp": (
                        _datetime_to_iso(
                            latest_telemetry.timestamp
                        )
                    ),

                    "verified": (
                        telemetry_verified
                    ),
                }

                if latest_telemetry

                else None
            ),

            # =================================================================
            # TECHNICAL PROOF
            # =================================================================

            "proof": {
                "animal_hash": (
                    local_animal_hash
                ),

                "animal_onchain_hash": (
                    _hash_to_string(
                        onchain_animal[2]
                    )

                    if animal_exists_onchain

                    else None
                ),

                "registered_by": (
                    onchain_animal[3]

                    if animal_exists_onchain

                    else None
                ),

                "registered_at": (
                    onchain_animal[4]

                    if animal_exists_onchain

                    else None
                ),

                "telemetry": (
                    telemetry_proof
                ),
            },

            # =================================================================
            # HUMAN MESSAGE
            # =================================================================

            "message": (
                "This animal's identity has been "
                "cryptographically verified against "
                "the Base blockchain."

                if animal_verified

                else

                "This animal is not currently "
                "verified against its Base "
                "blockchain identity."
            ),
        }

    except HTTPException:

        raise

    except Exception as error:

        print(
            "[Public Verification] "
            f"Blockchain warning: {error}"
        )

        raise HTTPException(
            status_code=503,

            detail=(
                "Blockchain verification "
                "service is temporarily "
                "unavailable."
            ),
        ) from error