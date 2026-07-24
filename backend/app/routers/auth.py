from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.orm import Session
import redis

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.deps import get_current_user, get_client_ip
from app.schemas.usuario import UsuarioLogin, UsuarioResponse
from app.services.auth import AuthService
from app.models.usuario import Usuario
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=UsuarioResponse)
@limiter.limit("5/minute")
def login(
    request: Request,
    login_data: UsuarioLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Inicia sesión de usuario, genera un token de acceso JWT y lo
    guarda en una cookie HTTPOnly + Secure + SameSite=Strict.
    Soporta Rate Limiting (máximo 5 intentos por minuto por IP).
    """
    # Obtener la IP del cliente considerando proxies
    ip = get_client_ip(request)

    # Autenticar vía servicio de negocio
    usuario, token = AuthService.login(
        db=db,
        email=login_data.email,
        password=login_data.password,
        ip=ip
    )

    # SameSite=None es obligatorio para cookies cross-origin (Vercel → Render)
    # Secure=True es requerido por los navegadores cuando SameSite=None
    is_production = settings.ENVIRONMENT != "development"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return usuario

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cierra la sesión del usuario, blacklistea el token JWT en Redis
    y remueve la cookie de autenticación del navegador.
    """
    ip = request.client.host if request.client else "unknown"
    token = request.cookies.get("access_token")

    if token:
        # Invalidar sesión vía servicio de negocio
        AuthService.logout(
            db=db,
            redis_client=redis_client,
            token=token,
            user=current_user,
            ip=ip
        )

    # Eliminar la cookie manteniendo los mismos atributos con que fue creada
    is_production = settings.ENVIRONMENT != "development"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        path="/"
    )

    return {"message": "Sesión cerrada correctamente."}

@router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Retorna los datos del perfil del usuario autenticado actual."""
    return current_user
