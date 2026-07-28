import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.middleware import SecurityHeadersMiddleware
from app.deps import get_client_ip
from app.routers import auth, vehiculos, inspecciones, export, audit_log, mantenimientos, notificaciones, estadisticas

# Asegurar que el directorio de subidas estáticas exista
os.makedirs("static/uploads", exist_ok=True)

# Configurar Rate Limiter usando la IP real del cliente (tras proxies de Render)
limiter = Limiter(key_func=get_client_ip, default_limits=["100/minute"])
app = FastAPI(title="Sistema de Inspección de Flota API", version="1.0.0")

from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").exception("Error no controlado")
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor. Intente nuevamente."})

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Añadir Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configuración de CORS — orígenes leídos desde variable de entorno + regex para subdominios Vercel
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174,https://car-checking-beta.vercel.app"
)
# Normalizar orígenes eliminando espacios y barras al final para evitar errores de preflight
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _raw_origins.split(",") if o.strip()]

# Regex para permitir dinámicamente cualquier subdominio o URL de previsualización en Vercel
ALLOW_ORIGIN_REGEX = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Montar directorio estático para servir imágenes/firmas (simulación de S3)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Incluir routers
app.include_router(auth.router, prefix="/api")
app.include_router(vehiculos.router, prefix="/api")
app.include_router(inspecciones.router, prefix="/api")
app.include_router(mantenimientos.router, prefix="/api")
app.include_router(notificaciones.router, prefix="/api")
app.include_router(estadisticas.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(audit_log.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "API de Inspección de Flota funcionando correctamente"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
