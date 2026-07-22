import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.middleware import SecurityHeadersMiddleware
from app.routers import auth, vehiculos, inspecciones, export, audit_log, mantenimientos, notificaciones, estadisticas

# Asegurar que el directorio de subidas estáticas exista
os.makedirs("static/uploads", exist_ok=True)

# Configurar Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app = FastAPI(title="Sistema de Inspección de Flota API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Añadir Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configuración de CORS — orígenes leídos desde variable de entorno
# En desarrollo: ALLOWED_ORIGINS no se define y usa los defaults locales
# En producción: ALLOWED_ORIGINS=https://tu-app.vercel.app,https://*.vercel.app
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5174"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
