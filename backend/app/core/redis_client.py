import redis
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis es opcional: si no está configurado, la app sigue funcionando
# (el blacklist de tokens JWT queda deshabilitado, pero el resto opera normal)
_redis_client: redis.Redis | None = None

def _init_redis() -> redis.Redis | None:
    try:
        pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,
        )
        client = redis.Redis(connection_pool=pool)
        client.ping()  # Verifica la conexión al iniciar
        logger.info("Redis conectado correctamente.")
        return client
    except Exception as e:
        logger.warning(f"Redis no disponible ({e}). El blacklist de tokens estará deshabilitado.")
        return None

_redis_client = _init_redis()

def get_redis() -> redis.Redis | None:
    """Retorna el cliente Redis, o None si no está disponible."""
    return _redis_client
