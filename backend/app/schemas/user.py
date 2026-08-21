from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# USER REGISTRATION
# =============================================================================

class UserCreate(BaseModel):

    email: EmailStr

    full_name: str = Field(
        min_length=1,
        max_length=150,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )


# =============================================================================
# USER RESPONSE
# =============================================================================

class UserResponse(BaseModel):

    id: int

    email: EmailStr

    full_name: str

    role: str

    is_email_verified: bool

    class Config:
        from_attributes = True


# =============================================================================
# FORGOT PASSWORD
# =============================================================================

class ForgotPasswordRequest(BaseModel):

    email: EmailStr


# =============================================================================
# RESET PASSWORD
# =============================================================================

class ResetPasswordRequest(BaseModel):

    token: str

    new_password: str = Field(
        min_length=8,
        max_length=128,
    )


# =============================================================================
# VERIFY EMAIL
# =============================================================================

class VerifyEmailRequest(BaseModel):

    token: str


# =============================================================================
# RESEND VERIFICATION
# =============================================================================

class ResendVerificationRequest(BaseModel):

    email: EmailStr