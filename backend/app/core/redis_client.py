import redis
from app.core.config import settings

# Inicializar un pool de conexiones a Redis con decodificación de respuestas a String
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL, 
    decode_responses=True
)
redis_client = redis.Redis(connection_pool=redis_pool)

def get_redis() -> redis.Redis:
    """Retorna la instancia global del cliente de Redis."""
    return redis_client
