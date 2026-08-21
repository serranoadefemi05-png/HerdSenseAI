from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# PASSWORD RESET REQUEST
# =============================================================================


class ForgotPasswordRequest(BaseModel):

    email: EmailStr


# =============================================================================
# PASSWORD RESET
# =============================================================================


class ResetPasswordRequest(BaseModel):

    token: str = Field(
        min_length=20,
    )

    new_password: str = Field(
        min_length=8,
    )


# =============================================================================
# EMAIL VERIFICATION
# =============================================================================


class VerifyEmailResponse(BaseModel):

    message: str


# =============================================================================
# GENERIC AUTH MESSAGE
# =============================================================================


class AuthMessage(BaseModel):

    message: str