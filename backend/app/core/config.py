from pydantic_settings import BaseSettings, SettingsConfigDict


# =============================================================================
# HERDSENSE AI — APPLICATION SETTINGS
# =============================================================================


class Settings(BaseSettings):
    # =========================================================================
    # APPLICATION
    # =========================================================================

    APP_NAME: str = "HerdSense AI"

    APP_ENV: str = "development"

    DEBUG: bool = False

    # =========================================================================
    # DATABASE
    # =========================================================================

    DATABASE_URL: str = "sqlite:///./herdsense.db"

    # =========================================================================
    # JWT / AUTHENTICATION
    # =========================================================================

    JWT_SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION"

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # =========================================================================
    # FRONTEND
    # =========================================================================

    FRONTEND_URL: str = "http://localhost:5173"

    # =========================================================================
    # CORS
    # =========================================================================

    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "https://herdsenseai-frontend.onrender.com,"
        "https://herdsenseai.pages.dev"
    )

    # =========================================================================
    # SMTP — BREVO
    # =========================================================================
    #
    # These values should be supplied through environment variables in
    # production. Do NOT hard-code the SMTP password/key here.
    #
    # Brevo:
    # SMTP_HOST=smtp-relay.brevo.com
    # SMTP_PORT=587
    # SMTP_USERNAME=b828e4001@smtp-brevo.com
    # SMTP_PASSWORD=<Brevo SMTP key>
    # SMTP_FROM_EMAIL=herdsenseai@gmail.com
    #
    # =========================================================================

    SMTP_HOST: str = "smtp-relay.brevo.com"

    SMTP_PORT: int = 587

    SMTP_USERNAME: str = ""

    SMTP_PASSWORD: str = ""

    SMTP_FROM_EMAIL: str = "herdsenseai@gmail.com"

    # =========================================================================
    # ADMINISTRATORS
    # =========================================================================

    ADMIN_EMAIL: str = ""

    ADMIN_PASSWORD: str = ""

    ADMIN_EMAIL_2: str = ""

    ADMIN_PASSWORD_2: str = ""

    # =========================================================================
    # BASE BLOCKCHAIN
    # =========================================================================

    BASE_RPC_URL: str = "https://sepolia.base.org"

    BASE_CHAIN_ID: int = 84532

    BASE_NETWORK: str = "base-sepolia"

    BASE_CONTRACT_ADDRESS: str = ""

    BASE_PRIVATE_KEY: str = ""

    BASE_EXPLORER_URL: str = (
        "https://sepolia.basescan.org"
    )

    # =========================================================================
    # PYDANTIC SETTINGS
    # =========================================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# =============================================================================
# SETTINGS INSTANCE
# =============================================================================

settings = Settings()