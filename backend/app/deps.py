from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import redis
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.core.security import decode_access_token
from app.models.usuario import Usuario

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
) -> Usuario:
    """
    Extrae el token JWT de la cookie 'access_token', lo decodifica,
    verifica la blacklist en Redis y retorna el usuario autenticado actual.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acceso denegado. No autenticado."
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido o expirado."
        )

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso con formato inválido."
        )

    # Verificar si el jti está en la blacklist de Redis
    is_blacklisted = redis_client.get(f"blacklist:{jti}")
    if is_blacklisted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión cerrada. Inicie sesión nuevamente."
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificador de usuario no válido en el token."
        )

    user = db.query(Usuario).filter(Usuario.id == user_id, Usuario.activo == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario no existe o está inactivo."
        )

    return user

class RoleChecker:
    """Verificador de roles del usuario autenticado."""
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.rol not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso prohibido. Permisos insuficientes."
            )
        return current_user

def require_role(roles: list[str]) -> RoleChecker:
    """Dependencia para restringir accesos según el rol."""
    return RoleChecker(roles)
