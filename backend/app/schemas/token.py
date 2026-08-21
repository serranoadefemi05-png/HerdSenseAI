from pydantic import BaseModel


# =============================================================================
# AUTHENTICATED USER INSIDE TOKEN RESPONSE
# =============================================================================

class TokenUser(BaseModel):

    id: int

    email: str

    full_name: str

    role: str

    is_email_verified: bool


# =============================================================================
# LOGIN RESPONSE
# =============================================================================

class Token(BaseModel):

    access_token: str

    token_type: str

    user: TokenUser