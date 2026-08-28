from __future__ import annotations

import hashlib
import json
from typing import Any

from eth_account import Account
from web3 import Web3

from app.core.config import settings


# ============================================================================
# HERDSENSE AI — BASE BLOCKCHAIN SERVICE
# ============================================================================
#
# Base Sepolia integration for:
#
# - Animal identity registration
# - Animal identity verification
# - Animal identity updates
# - Telemetry anchoring
# - Telemetry verification
#
# IMPORTANT ARCHITECTURE
# ----------------------
#
# PostgreSQL remains the source of truth for complete application data.
#
# Base stores cryptographic fingerprints.
#
# Animal hashes contain STABLE IDENTITY information only.
#
# Telemetry hashes contain telemetry information.
#
# This prevents normal telemetry updates from invalidating the animal's
# permanent blockchain identity.
#
# ============================================================================


BASE_CONTRACT_ABI = [

    # ========================================================================
    # READ
    # ========================================================================

    {
        "inputs": [],
        "name": "owner",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address",
            }
        ],
        "name": "authorizedWriters",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "animalId",
                "type": "uint256",
            }
        ],
        "name": "getAnimalRecord",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
            {
                "internalType": "string",
                "name": "",
                "type": "string",
            },
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32",
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address",
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            },
        ],
        "stateMutability": "view",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "telemetryId",
                "type": "uint256",
            }
        ],
        "name": "getTelemetryRecord",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32",
            },
            {
                "internalType": "address",
                "name": "",
                "type": "address",
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256",
            },
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            },
        ],
        "stateMutability": "view",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "animalId",
                "type": "uint256",
            },
            {
                "internalType": "bytes32",
                "name": "suppliedHash",
                "type": "bytes32",
            },
        ],
        "name": "verifyAnimal",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "telemetryId",
                "type": "uint256",
            },
            {
                "internalType": "bytes32",
                "name": "suppliedHash",
                "type": "bytes32",
            },
        ],
        "name": "verifyTelemetry",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },

    # ========================================================================
    # WRITE
    # ========================================================================

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "animalId",
                "type": "uint256",
            },
            {
                "internalType": "string",
                "name": "tagId",
                "type": "string",
            },
            {
                "internalType": "bytes32",
                "name": "dataHash",
                "type": "bytes32",
            },
        ],
        "name": "registerAnimal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "animalId",
                "type": "uint256",
            },
            {
                "internalType": "bytes32",
                "name": "newDataHash",
                "type": "bytes32",
            },
        ],
        "name": "updateAnimalRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },

    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "telemetryId",
                "type": "uint256",
            },
            {
                "internalType": "uint256",
                "name": "animalId",
                "type": "uint256",
            },
            {
                "internalType": "bytes32",
                "name": "dataHash",
                "type": "bytes32",
            },
        ],
        "name": "anchorTelemetry",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


# ============================================================================
# WEB3 CONNECTION
# ============================================================================


def get_web3() -> Web3:
    """
    Create a Web3 connection to Base.
    """

    rpc_url = settings.BASE_RPC_URL

    if not rpc_url:
        raise RuntimeError(
            "BASE_RPC_URL is not configured."
        )

    web3 = Web3(
        Web3.HTTPProvider(
            rpc_url
        )
    )

    if not web3.is_connected():
        raise RuntimeError(
            "Unable to connect to Base RPC."
        )

    return web3


# ============================================================================
# CONTRACT
# ============================================================================


def get_contract(
    web3: Web3 | None = None,
):
    """
    Return the deployed HerdSenseRegistry contract.
    """

    if not settings.BASE_CONTRACT_ADDRESS:
        raise RuntimeError(
            "BASE_CONTRACT_ADDRESS is not configured."
        )

    web3 = web3 or get_web3()

    return web3.eth.contract(
        address=Web3.to_checksum_address(
            settings.BASE_CONTRACT_ADDRESS
        ),
        abi=BASE_CONTRACT_ABI,
    )


# ============================================================================
# WALLET
# ============================================================================


def get_backend_account():
    """
    Load the backend blockchain wallet.
    """

    private_key = settings.BASE_PRIVATE_KEY

    if not private_key:
        raise RuntimeError(
            "BASE_PRIVATE_KEY is not configured."
        )

    return Account.from_key(
        private_key
    )


# ============================================================================
# CONFIGURATION
# ============================================================================


def blockchain_configuration() -> dict[str, Any]:
    """
    Return the current Base integration configuration.
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

        "wallet_configured": bool(
            settings.BASE_PRIVATE_KEY
        ),

        "contract": settings.BASE_CONTRACT_ADDRESS,

        "explorer": settings.BASE_EXPLORER_URL,
    }


# ============================================================================
# HASHING
# ============================================================================


def create_data_hash(
    data: dict[str, Any],
) -> str:
    """
    Create deterministic SHA-256 hash.
    """

    normalized_data = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )

    return hashlib.sha256(
        normalized_data.encode(
            "utf-8"
        )
    ).hexdigest()


def hash_to_bytes32(
    data_hash: str,
) -> bytes:
    """
    Convert a SHA-256 hexadecimal hash into bytes32.
    """

    clean_hash = (
        data_hash
        .lower()
        .removeprefix("0x")
    )

    if len(clean_hash) != 64:
        raise ValueError(
            "Data hash must contain exactly "
            "64 hexadecimal characters."
        )

    try:

        return bytes.fromhex(
            clean_hash
        )

    except ValueError as error:

        raise ValueError(
            "Data hash contains invalid "
            "hexadecimal characters."
        ) from error


# ============================================================================
# ANIMAL IDENTITY RECORD
# ============================================================================


def build_animal_record(
    animal,
) -> dict[str, Any]:
    """
    Build the stable identity record for blockchain verification.

    IMPORTANT:
    Do NOT include live telemetry or mutable health values here.

    Those belong to telemetry records.
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

        "farm_id": animal.farm_id,
    }


def get_animal_data_hash(
    animal,
) -> str:
    """
    Generate the SHA-256 fingerprint for
    the animal's stable identity.
    """

    return create_data_hash(
        build_animal_record(
            animal
        )
    )


# ============================================================================
# TELEMETRY RECORD
# ============================================================================


def build_telemetry_record(
    telemetry,
) -> dict[str, Any]:
    """
    Convert Telemetry SQLAlchemy model into
    deterministic blockchain data.
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
    telemetry,
) -> str:
    """
    Generate the SHA-256 fingerprint for telemetry.
    """

    return create_data_hash(
        build_telemetry_record(
            telemetry
        )
    )


# ============================================================================
# TRANSACTION HELPERS
# ============================================================================


def _build_transaction(
    web3: Web3,
    function,
    account_address: str,
) -> dict[str, Any]:
    """
    Build a transaction compatible with Web3.py 7.
    """

    chain_id = web3.eth.chain_id

    if chain_id != settings.BASE_CHAIN_ID:

        raise RuntimeError(
            f"Wrong blockchain network. "
            f"Expected chain ID "
            f"{settings.BASE_CHAIN_ID}, "
            f"received {chain_id}."
        )

    nonce = (
        web3.eth.get_transaction_count(
            account_address,
            "pending",
        )
    )

    gas_price = web3.eth.gas_price

    transaction = function.build_transaction(
        {
            "from": account_address,

            "nonce": nonce,

            "chainId": chain_id,

            "gas": 500_000,

            "gasPrice": gas_price,
        }
    )

    return transaction


def _send_transaction(
    web3: Web3,
    function,
) -> dict[str, Any]:
    """
    Sign and send a blockchain transaction.
    """

    account = get_backend_account()

    transaction = _build_transaction(
        web3=web3,

        function=function,

        account_address=account.address,
    )

    signed_transaction = (
        account.sign_transaction(
            transaction
        )
    )

    tx_hash = (
        web3.eth.send_raw_transaction(
            signed_transaction.raw_transaction
        )
    )

    receipt = (
        web3.eth.wait_for_transaction_receipt(
            tx_hash
        )
    )

    if receipt["status"] != 1:

        raise RuntimeError(
            f"Base transaction failed: "
            f"{tx_hash.hex()}"
        )

    return {
        "transaction_hash": tx_hash.hex(),

        "block_number": receipt[
            "blockNumber"
        ],

        "status": receipt["status"],

        "explorer_url": (
            f"{settings.BASE_EXPLORER_URL}/tx/"
            f"{tx_hash.hex()}"
            if settings.BASE_EXPLORER_URL
            else None
        ),
    }


# ============================================================================
# CONTRACT STATUS
# ============================================================================


def get_contract_status() -> dict[str, Any]:
    """
    Verify RPC, contract, wallet and writer authorization.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    account = get_backend_account()

    owner = (
        contract.functions
        .owner()
        .call()
    )

    authorized = (
        contract.functions
        .authorizedWriters(
            account.address
        )
        .call()
    )

    return {
        "connected": True,

        "chain_id": web3.eth.chain_id,

        "expected_chain_id": (
            settings.BASE_CHAIN_ID
        ),

        "contract": (
            settings.BASE_CONTRACT_ADDRESS
        ),

        "wallet": account.address,

        "owner": owner,

        "authorized_writer": authorized,

        "network": settings.BASE_NETWORK,
    }


# ============================================================================
# ANIMAL REGISTRATION
# ============================================================================


def register_animal(
    animal,
) -> dict[str, Any]:
    """
    Register an animal's stable identity on Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    data_hash = (
        get_animal_data_hash(
            animal
        )
    )

    data_hash_bytes = (
        hash_to_bytes32(
            data_hash
        )
    )

    existing = (
        contract.functions
        .getAnimalRecord(
            animal.id
        )
        .call()
    )

    if existing[5]:

        return {
            "success": False,

            "already_registered": True,

            "animal_id": animal.id,

            "data_hash": data_hash,

            "onchain_hash": (
                existing[2].hex()
                if hasattr(
                    existing[2],
                    "hex",
                )
                else str(
                    existing[2]
                )
            ),

            "message": (
                "Animal is already registered "
                "on Base."
            ),
        }

    result = _send_transaction(
        web3=web3,

        function=(
            contract.functions
            .registerAnimal(
                animal.id,

                animal.tag_id,

                data_hash_bytes,
            )
        ),
    )

    return {
        "success": True,

        "already_registered": False,

        "animal_id": animal.id,

        "tag_id": animal.tag_id,

        "data_hash": data_hash,

        **result,
    }


# ============================================================================
# ANIMAL UPDATE
# ============================================================================


def update_animal_record(
    animal,
) -> dict[str, Any]:
    """
    Update the stable identity fingerprint.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    data_hash = (
        get_animal_data_hash(
            animal
        )
    )

    data_hash_bytes = (
        hash_to_bytes32(
            data_hash
        )
    )

    existing = (
        contract.functions
        .getAnimalRecord(
            animal.id
        )
        .call()
    )

    if not existing[5]:

        raise RuntimeError(
            "Animal is not registered on Base."
        )

    result = _send_transaction(
        web3=web3,

        function=(
            contract.functions
            .updateAnimalRecord(
                animal.id,

                data_hash_bytes,
            )
        ),
    )

    return {
        "success": True,

        "animal_id": animal.id,

        "data_hash": data_hash,

        **result,
    }


# ============================================================================
# TELEMETRY ANCHOR
# ============================================================================


def anchor_telemetry(
    telemetry,
) -> dict[str, Any]:
    """
    Anchor telemetry on Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    data_hash = (
        get_telemetry_data_hash(
            telemetry
        )
    )

    data_hash_bytes = (
        hash_to_bytes32(
            data_hash
        )
    )

    existing = (
        contract.functions
        .getTelemetryRecord(
            telemetry.id
        )
        .call()
    )

    if existing[5]:

        return {
            "success": False,

            "already_anchored": True,

            "telemetry_id": (
                telemetry.id
            ),

            "animal_id": (
                telemetry.animal_id
            ),

            "data_hash": data_hash,

            "onchain_hash": (
                existing[2].hex()
                if hasattr(
                    existing[2],
                    "hex",
                )
                else str(
                    existing[2]
                )
            ),

            "message": (
                "Telemetry is already "
                "anchored on Base."
            ),
        }

    result = _send_transaction(
        web3=web3,

        function=(
            contract.functions
            .anchorTelemetry(
                telemetry.id,

                telemetry.animal_id,

                data_hash_bytes,
            )
        ),
    )

    return {
        "success": True,

        "already_anchored": False,

        "telemetry_id": telemetry.id,

        "animal_id": telemetry.animal_id,

        "data_hash": data_hash,

        **result,
    }


# ============================================================================
# READ ANIMAL
# ============================================================================


def get_onchain_animal(
    animal_id: int,
) -> dict[str, Any]:
    """
    Retrieve an animal record from Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    record = (
        contract.functions
        .getAnimalRecord(
            animal_id
        )
        .call()
    )

    return {
        "animal_id": record[0],

        "tag_id": record[1],

        "data_hash": (
            record[2].hex()
            if hasattr(
                record[2],
                "hex",
            )
            else str(
                record[2]
            )
        ),

        "registered_by": record[3],

        "registered_at": record[4],

        "exists": record[5],
    }


# ============================================================================
# READ TELEMETRY
# ============================================================================


def get_onchain_telemetry(
    telemetry_id: int,
) -> dict[str, Any]:
    """
    Retrieve telemetry record from Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    record = (
        contract.functions
        .getTelemetryRecord(
            telemetry_id
        )
        .call()
    )

    return {
        "telemetry_id": record[0],

        "animal_id": record[1],

        "data_hash": (
            record[2].hex()
            if hasattr(
                record[2],
                "hex",
            )
            else str(
                record[2]
            )
        ),

        "anchored_by": record[3],

        "anchored_at": record[4],

        "exists": record[5],
    }


# ============================================================================
# VERIFY ANIMAL
# ============================================================================


def verify_animal(
    animal,
) -> dict[str, Any]:
    """
    Verify the stable PostgreSQL animal identity
    against Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    local_hash = (
        get_animal_data_hash(
            animal
        )
    )

    local_hash_bytes = (
        hash_to_bytes32(
            local_hash
        )
    )

    verified = (
        contract.functions
        .verifyAnimal(
            animal.id,

            local_hash_bytes,
        )
        .call()
    )

    return {
        "verified": verified,

        "animal_id": animal.id,

        "local_hash": local_hash,

        "network": settings.BASE_NETWORK,

        "contract": (
            settings.BASE_CONTRACT_ADDRESS
        ),
    }


# ============================================================================
# VERIFY TELEMETRY
# ============================================================================


def verify_telemetry(
    telemetry,
) -> dict[str, Any]:
    """
    Verify telemetry against Base.
    """

    web3 = get_web3()

    contract = get_contract(
        web3
    )

    local_hash = (
        get_telemetry_data_hash(
            telemetry
        )
    )

    local_hash_bytes = (
        hash_to_bytes32(
            local_hash
        )
    )

    verified = (
        contract.functions
        .verifyTelemetry(
            telemetry.id,

            local_hash_bytes,
        )
        .call()
    )

    return {
        "verified": verified,

        "telemetry_id": telemetry.id,

        "animal_id": telemetry.animal_id,

        "local_hash": local_hash,

        "network": settings.BASE_NETWORK,

        "contract": (
            settings.BASE_CONTRACT_ADDRESS
        ),
    }