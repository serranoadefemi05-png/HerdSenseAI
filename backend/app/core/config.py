from functools import lru_cache

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


class Settings(BaseSettings):

    # ============================================================
    # APPLICATION
    # ============================================================

    APP_NAME: str = "HerdSense AI"

    ENVIRONMENT: str = "development"

    # ============================================================
    # DATABASE
    # ============================================================

    DATABASE_URL: str

    # ============================================================
    # JWT
    # ============================================================

    JWT_SECRET: str

    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ============================================================
    # FRONTEND / CORS
    # ============================================================

    FRONTEND_URL: str = (
        "http://localhost:5173"
    )

    # ============================================================
    # BASE BLOCKCHAIN
    # ============================================================

    BASE_RPC_URL: str = ""

    BASE_CHAIN_ID: int = 84532

    BASE_CONTRACT_ADDRESS: str = ""

    BASE_NETWORK: str = "base-sepolia"

    # ============================================================
    # PYDANTIC SETTINGS
    # ============================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()