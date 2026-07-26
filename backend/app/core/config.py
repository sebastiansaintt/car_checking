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
    UPSTASH_REDIS_REST_URL: str = Field(
        default="",
        validation_alias="UPSTASH_REDIS_REST_URL"
    )
    UPSTASH_REDIS_REST_TOKEN: str = Field(
        default="",
        validation_alias="UPSTASH_REDIS_REST_TOKEN"
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

    @property
    def effective_database_url(self) -> str:
        """
        Corrige esquemas de conexión 'postgres://' a 'postgresql://' requeridos por SQLAlchemy 2.0.
        """
        url = self.DATABASE_URL
        if url and url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

    @property
    def effective_redis_url(self) -> str:
        """
        Construye la URL rediss:// de Upstash si se proveen las credenciales REST o retorna REDIS_URL.
        """
        if self.UPSTASH_REDIS_REST_URL and self.UPSTASH_REDIS_REST_TOKEN:
            host = self.UPSTASH_REDIS_REST_URL.replace("https://", "").replace("http://", "").strip("/")
            return f"rediss://default:{self.UPSTASH_REDIS_REST_TOKEN}@{host}:6379"
        return self.REDIS_URL

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
