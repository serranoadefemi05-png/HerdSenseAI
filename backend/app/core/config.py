from pydantic_settings import BaseSettings, SettingsConfigDict


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
    # JWT
    # =========================================================================

    JWT_SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION"

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # =========================================================================
    # FRONTEND
    # =========================================================================

    FRONTEND_URL: str = "http://localhost:5173"

    CORS_ORIGINS: str = "http://localhost:5173"

    # =========================================================================
    # GMAIL / SMTP
    # =========================================================================

    SMTP_HOST: str = "smtp.gmail.com"

    SMTP_PORT: int = 587

    SMTP_USERNAME: str = ""

    SMTP_PASSWORD: str = ""

    SMTP_FROM_EMAIL: str = ""

    # =========================================================================
    # ADMIN
    # =========================================================================

    ADMIN_EMAIL: str = ""

    ADMIN_PASSWORD: str = ""

    ADMIN_EMAIL_2: str = ""

    ADMIN_PASSWORD_2: str = ""

    # =========================================================================
    # BASE
    # =========================================================================

    BASE_RPC_URL: str = "https://sepolia.base.org"

    BASE_CHAIN_ID: int = 84532

    BASE_NETWORK: str = "base-sepolia"

    BASE_CONTRACT_ADDRESS: str = ""

    # =========================================================================
    # PYDANTIC SETTINGS
    # =========================================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()