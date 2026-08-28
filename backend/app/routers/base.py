from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.database import get_db

from app.models.user import User
from app.models.farm import Farm
from app.models.animal import Animal
from app.models.telemetry import Telemetry

from app.services.base_service import (
    blockchain_configuration,
    get_contract_status,
    get_animal_data_hash,
    get_telemetry_data_hash,
    register_animal,
    update_animal_record,
    anchor_telemetry,
    get_onchain_animal,
    get_onchain_telemetry,
    verify_animal,
    verify_telemetry,
)

from app.services.qr_service import (
    generate_qr_code,
)


router = APIRouter(
    prefix="/api/v1/base",
    tags=["Base Blockchain"],
)


# =============================================================================
# OWNERSHIP HELPERS
# =============================================================================


def get_owned_animal(
    animal_id: int,
    db: Session,
    current_user: User,
) -> Animal:
    """
    Return an animal only when it belongs to a farm
    owned by the authenticated user.
    """

    animal = (
        db.query(Animal)
        .join(Farm)
        .filter(
            Animal.id == animal_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=404,
            detail="Animal not found",
        )

    return animal


def get_owned_telemetry(
    telemetry_id: int,
    db: Session,
    current_user: User,
) -> Telemetry:
    """
    Return telemetry only when its animal belongs
    to a farm owned by the authenticated user.
    """

    telemetry = (
        db.query(Telemetry)
        .join(Animal)
        .join(Farm)
        .filter(
            Telemetry.id == telemetry_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not telemetry:
        raise HTTPException(
            status_code=404,
            detail="Telemetry not found",
        )

    return telemetry


# =============================================================================
# PUBLIC ANIMAL HELPER
# =============================================================================


def get_public_animal(
    animal_id: int,
    db: Session,
) -> Animal:
    """
    Retrieve an animal for public verification.

    IMPORTANT:
    This intentionally does not require authentication.

    Public QR verification must work for farmers, buyers,
    veterinarians, insurers and other authorized viewers
    without requiring a HerdSense AI login.
    """

    animal = (
        db.query(Animal)
        .filter(
            Animal.id == animal_id,
        )
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=404,
            detail="Animal verification record not found.",
        )

    return animal


# =============================================================================
# LATEST TELEMETRY HELPER
# =============================================================================


def get_latest_telemetry(
    animal_id: int,
    db: Session,
) -> Telemetry | None:
    """
    Return the most recent telemetry record for an animal.
    """

    return (
        db.query(Telemetry)
        .filter(
            Telemetry.animal_id == animal_id,
        )
        .order_by(
            Telemetry.timestamp.desc()
        )
        .first()
    )


# =============================================================================
# BASE STATUS
# =============================================================================


@router.get(
    "/status"
)
def get_base_status(
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Return the live Base blockchain connection status.

    This verifies:

    - RPC connectivity
    - chain ID
    - deployed contract
    - backend wallet
    - contract owner
    - authorized writer
    """

    try:

        status_data = get_contract_status()

        return {
            "status": "ready",
            "blockchain": status_data,
        }

    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Base connection error: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# PREPARE ANIMAL RECORD
# =============================================================================


@router.get(
    "/animals/{animal_id}/record"
)
def prepare_animal_record(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Generate the current animal fingerprint.

    No blockchain transaction is sent.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    data_hash = get_animal_data_hash(
        animal
    )

    return {
        "blockchain": "Base",
        "network": blockchain_configuration()[
            "network"
        ],
        "animal": {
            "id": animal.id,
            "tag_id": animal.tag_id,
            "name": animal.name,
            "species": animal.species,
            "farm_id": animal.farm_id,
        },
        "data_hash": data_hash,
        "message": (
            "Animal data prepared for "
            "Base registration."
        ),
    }


# =============================================================================
# REGISTER ANIMAL ON BASE
# =============================================================================


@router.post(
    "/animals/{animal_id}/register"
)
def register_animal_on_base(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Register an existing HerdSense animal on Base.

    The complete animal record remains in PostgreSQL.
    Only its cryptographic fingerprint is written on-chain.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = register_animal(
            animal
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to register animal on Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# UPDATE ANIMAL RECORD ON BASE
# =============================================================================


@router.post(
    "/animals/{animal_id}/update"
)
def update_animal_on_base(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Update the on-chain fingerprint for an already
    registered animal.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = update_animal_record(
            animal
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to update animal on Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# GET ON-CHAIN ANIMAL
# =============================================================================


@router.get(
    "/animals/{animal_id}/onchain"
)
def read_onchain_animal(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Retrieve the animal's blockchain record.
    """

    get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = get_onchain_animal(
            animal_id
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to read animal from Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# VERIFY ANIMAL
# =============================================================================


@router.get(
    "/animals/{animal_id}/verify"
)
def verify_animal_on_base(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Compare the current PostgreSQL animal fingerprint
    with the fingerprint stored on Base.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = verify_animal(
            animal
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to verify animal on Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# PUBLIC ANIMAL VERIFICATION RECORD
# =============================================================================


@router.get(
    "/verify/animal/{animal_id}"
)
def public_animal_verification(
    animal_id: int,
    db: Session = Depends(get_db),
):
    """
    Public human-readable animal verification record.

    This endpoint intentionally does NOT require authentication.

    It combines:

    - HerdSense animal identity
    - latest telemetry
    - Base blockchain registration
    - cryptographic verification

    Sensitive farm-owner information is intentionally excluded.
    """

    animal = get_public_animal(
        animal_id=animal_id,
        db=db,
    )

    latest_telemetry = get_latest_telemetry(
        animal_id=animal.id,
        db=db,
    )

    # -------------------------------------------------------------------------
    # Read blockchain record
    # -------------------------------------------------------------------------

    try:

        onchain_record = get_onchain_animal(
            animal.id
        )

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve the animal's "
                f"Base record: {str(error)}"
            ),
        )

    # -------------------------------------------------------------------------
    # Verify blockchain integrity
    # -------------------------------------------------------------------------

    try:

        verification = verify_animal(
            animal
        )

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to verify the animal's "
                f"Base record: {str(error)}"
            ),
        )

    # -------------------------------------------------------------------------
    # Latest telemetry
    # -------------------------------------------------------------------------

    telemetry_data = None

    if latest_telemetry:

        telemetry_data = {
            "id": latest_telemetry.id,
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
                latest_telemetry.timestamp.isoformat()
                if latest_telemetry.timestamp
                else None
            ),
        }

    # -------------------------------------------------------------------------
    # Public verification response
    # -------------------------------------------------------------------------

    return {
        "verified": bool(
            verification["verified"]
        ),
        "blockchain": "Base",
        "network": blockchain_configuration()[
            "network"
        ],

        "animal": {
            "id": animal.id,
            "tag_id": animal.tag_id,
            "name": animal.name,
            "species": animal.species,
        },

        "record": {
            "status": (
                "Verified"
                if verification["verified"]
                else "Verification failed"
            ),
            "registered_on_base": bool(
                onchain_record["exists"]
            ),
        },

        "latest_telemetry": telemetry_data,

        "blockchain_proof": {
            "verified": bool(
                verification["verified"]
            ),
            "contract": (
                settings.BASE_CONTRACT_ADDRESS
            ),
            "onchain_hash": (
                onchain_record["data_hash"]
            ),
            "local_hash": (
                verification["local_hash"]
            ),
            "registered_by": (
                onchain_record["registered_by"]
            ),
            "registered_at": (
                onchain_record["registered_at"]
            ),
        },

        "message": (
            "This animal's digital record has "
            "been cryptographically verified on Base."
        ),
    }


# =============================================================================
# ANIMAL QR CODE
# =============================================================================


@router.get(
    "/animals/{animal_id}/qr"
)
def get_animal_qr(
    animal_id: int,
    db: Session = Depends(get_db),
):
    """
    Generate a QR code for an animal's public
    HerdSense AI verification page.

    Authentication is intentionally not required.

    The QR contains only the public verification URL.
    """

    animal = get_public_animal(
        animal_id=animal_id,
        db=db,
    )

    # -------------------------------------------------------------------------
    # Determine public frontend URL
    # -------------------------------------------------------------------------

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        None,
    )

    if not frontend_url:

        raise HTTPException(
            status_code=503,
            detail=(
                "FRONTEND_URL is not configured. "
                "Unable to generate public animal QR code."
            ),
        )

    frontend_url = (
        frontend_url
        .strip()
        .rstrip("/")
    )

    verification_url = (
        f"{frontend_url}"
        f"/verify/animal/{animal.id}"
    )

    # -------------------------------------------------------------------------
    # Generate QR
    # -------------------------------------------------------------------------

    try:

        qr_image = generate_qr_code(
            verification_url
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to generate animal QR code: "
                f"{str(error)}"
            ),
        )

    # -------------------------------------------------------------------------
    # Return PNG
    # -------------------------------------------------------------------------

    return Response(
        content=qr_image,
        media_type="image/png",
        headers={
            "Content-Disposition": (
                f'inline; filename="herdsense-animal-'
                f'{animal.id}-qr.png"'
            ),
            "Cache-Control": "public, max-age=3600",
        },
    )


# =============================================================================
# PREPARE TELEMETRY RECORD
# =============================================================================


@router.get(
    "/telemetry/{telemetry_id}/record"
)
def prepare_telemetry_record(
    telemetry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Generate the current telemetry fingerprint.

    No blockchain transaction is sent.
    """

    telemetry = get_owned_telemetry(
        telemetry_id=telemetry_id,
        db=db,
        current_user=current_user,
    )

    data_hash = get_telemetry_data_hash(
        telemetry
    )

    return {
        "blockchain": "Base",
        "network": blockchain_configuration()[
            "network"
        ],
        "telemetry": {
            "id": telemetry.id,
            "animal_id": telemetry.animal_id,
            "timestamp": (
                telemetry.timestamp.isoformat()
                if telemetry.timestamp
                else None
            ),
        },
        "data_hash": data_hash,
        "message": (
            "Telemetry data prepared for "
            "Base anchoring."
        ),
    }


# =============================================================================
# ANCHOR TELEMETRY ON BASE
# =============================================================================


@router.post(
    "/telemetry/{telemetry_id}/anchor"
)
def anchor_telemetry_on_base(
    telemetry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Anchor an existing telemetry record on Base.

    The complete telemetry record remains in PostgreSQL.
    Only its cryptographic fingerprint is written on-chain.
    """

    telemetry = get_owned_telemetry(
        telemetry_id=telemetry_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = anchor_telemetry(
            telemetry
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to anchor telemetry on Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# GET ON-CHAIN TELEMETRY
# =============================================================================


@router.get(
    "/telemetry/{telemetry_id}/onchain"
)
def read_onchain_telemetry(
    telemetry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Retrieve an anchored telemetry record from Base.
    """

    get_owned_telemetry(
        telemetry_id=telemetry_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = get_onchain_telemetry(
            telemetry_id
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to read telemetry from Base: "
                f"{str(error)}"
            ),
        )


# =============================================================================
# VERIFY TELEMETRY
# =============================================================================


@router.get(
    "/telemetry/{telemetry_id}/verify"
)
def verify_telemetry_on_base(
    telemetry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    """
    Compare the current PostgreSQL telemetry fingerprint
    with the fingerprint stored on Base.
    """

    telemetry = get_owned_telemetry(
        telemetry_id=telemetry_id,
        db=db,
        current_user=current_user,
    )

    try:

        result = verify_telemetry(
            telemetry
        )

        return {
            "blockchain": "Base",
            "network": blockchain_configuration()[
                "network"
            ],
            **result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=502,
            detail=(
                "Failed to verify telemetry on Base: "
                f"{str(error)}"
            ),
        )