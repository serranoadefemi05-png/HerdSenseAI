from pydantic import BaseModel, Field


# =============================================================================
# CONNECT WALLET
# =============================================================================

class WalletConnectRequest(BaseModel):

    wallet_address: str = Field(
        min_length=42,
        max_length=42,
    )

    wallet_chain: str = Field(
        min_length=1,
        max_length=100,
    )


# =============================================================================
# WALLET RESPONSE
# =============================================================================

class WalletResponse(BaseModel):

    wallet_address: str | None = None