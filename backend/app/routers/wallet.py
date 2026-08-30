from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.wallet import (
    WalletConnectRequest,
    WalletResponse,
)


router = APIRouter(
    prefix="/api/v1/wallet",
    tags=["Wallet"],
)


# =============================================================================
# GET CURRENT USER WALLET
# =============================================================================

@router.get(
    "",
    response_model=WalletResponse,
)
def get_wallet(
    current_user: User = Depends(get_current_user),
):
    return WalletResponse(
        wallet_address=current_user.wallet_address
    )


# =============================================================================
# CONNECT / SAVE WALLET
# =============================================================================

@router.post(
    "/connect",
    response_model=WalletResponse,
)
def connect_wallet(
    payload: WalletConnectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet_address = payload.wallet_address.strip()
    wallet_chain = payload.wallet_chain.strip()

    # -------------------------------------------------------------------------
    # Basic EVM wallet validation
    # -------------------------------------------------------------------------

    if not wallet_address.startswith("0x"):
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address.",
        )

    if len(wallet_address) != 42:
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address length.",
        )

    if not wallet_chain:
        raise HTTPException(
            status_code=400,
            detail="Wallet chain is required.",
        )

    # -------------------------------------------------------------------------
    # Prevent one wallet from being attached to multiple HerdSense accounts
    # -------------------------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.wallet_address == wallet_address,
            User.id != current_user.id,
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail=(
                "This wallet is already connected to "
                "another HerdSense AI account."
            ),
        )

    # -------------------------------------------------------------------------
    # Save wallet information
    # -------------------------------------------------------------------------

    current_user.wallet_address = wallet_address
    current_user.wallet_chain = wallet_chain
    current_user.wallet_connected_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(current_user)

    return WalletResponse(
        wallet_address=current_user.wallet_address
    )


# =============================================================================
# DISCONNECT WALLET
# =============================================================================

@router.delete(
    "",
    response_model=WalletResponse,
)
def disconnect_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.wallet_address = None
    current_user.wallet_chain = None
    current_user.wallet_connected_at = None

    db.commit()
    db.refresh(current_user)

    return WalletResponse(
        wallet_address=None
    )