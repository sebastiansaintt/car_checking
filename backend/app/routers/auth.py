from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.orm import Session
import redis

from app.core.config import settings
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.security import decode_access_token, create_access_token
from app.deps import get_current_user, get_client_ip
from app.schemas.usuario import UsuarioLogin, UsuarioResponse
from app.services.auth import AuthService
from app.models.usuario import Usuario
from slowapi import Limiter

limiter = Limiter(key_func=get_client_ip)
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
    guarda en una cookie HTTPOnly + Secure + SameSite=Strict/None.
    Soporta Rate Limiting (máximo 5 intentos por minuto por IP real).
    """
    ip = get_client_ip(request)

    usuario, token = AuthService.login(
        db=db,
        email=login_data.email,
        password=login_data.password,
        ip=ip
    )

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
    ip = get_client_ip(request)
    token = request.cookies.get("access_token")

    if token:
        AuthService.logout(
            db=db,
            redis_client=redis_client,
            token=token,
            user=current_user,
            ip=ip
        )

    is_production = settings.ENVIRONMENT != "development"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        path="/"
    )

    return {"message": "Sesión cerrada correctamente."}

@router.post("/refresh")
def refresh_token(
    request: Request,
    response: Response,
    redis_client: redis.Redis = Depends(get_redis),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Genera un nuevo token JWT, blacklistea el anterior en Redis y
    actualiza la cookie HTTPOnly.
    """
    token_anterior = request.cookies.get("access_token")
    if token_anterior:
        payload = decode_access_token(token_anterior)
        if payload and "jti" in payload:
            jti = payload["jti"]
            try:
                redis_client.setex(f"blacklist:{jti}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "true")
            except redis.RedisError:
                pass

    nuevo_token = create_access_token(data={"sub": str(current_user.id), "rol": current_user.rol})
    
    is_production = settings.ENVIRONMENT != "development"
    response.set_cookie(
        key="access_token",
        value=nuevo_token,
        httponly=True,
        secure=is_production,
        samesite="none" if is_production else "lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return {"message": "Token renovado con éxito."}

@router.post("/logout-beacon", status_code=status.HTTP_204_NO_CONTENT)
def logout_beacon(
    request: Request,
    redis_client: redis.Redis = Depends(get_redis)
):
    """
    Endpoint para Beacon API al cerrar pestaña/navegador.
    Blacklistea el token si existe sin depender de get_current_user.
    """
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if token:
        payload = decode_access_token(token)
        if payload and "jti" in payload:
            jti = payload["jti"]
            try:
                redis_client.setex(f"blacklist:{jti}", settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "true")
            except redis.RedisError:
                pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Retorna los datos del perfil del usuario autenticado actual."""
    return current_user
