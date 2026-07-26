import redis
from app.core.config import settings

# Inicializar pool de conexiones a Redis (soporta SSL/TLS rediss:// para Upstash)
redis_pool = redis.ConnectionPool.from_url(
    settings.effective_redis_url,
    decode_responses=True
)
redis_client = redis.Redis(connection_pool=redis_pool)

def get_redis() -> redis.Redis:
    """Retorna la instancia global del cliente de Redis."""
    return redis_client
