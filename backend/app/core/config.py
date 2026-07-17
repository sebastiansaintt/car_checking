import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    DATABASE_URL: str = Field(
        default="postgresql://postgres:securepassword123@db:5432/car_checking",
        validation_alias="DATABASE_URL"
    )
    REDIS_URL: str = Field(
        default="redis://redis:6379/0",
        validation_alias="REDIS_URL"
    )
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias="ENVIRONMENT"
    )
    SECRET_KEY: str = Field(
        default="super-secret-key-change-in-production-1234567890",
        validation_alias="SECRET_KEY"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    SESSION_INACTIVITY_TIMEOUT_SECONDS: int = 1800 # 30 minutos

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
