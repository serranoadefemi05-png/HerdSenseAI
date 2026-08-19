from pydantic import BaseModel


# ============================================================================
# AUTHENTICATED USER
# ============================================================================

class TokenUser(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


# ============================================================================
# JWT LOGIN RESPONSE
# ============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    user: TokenUser


# ============================================================================
# JWT TOKEN DATA
# ============================================================================

class TokenData(BaseModel):
    email: str | None = None