from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import redis

from app.core.security import verify_password, create_access_token, decode_access_token
from app.repositories.usuario import UsuarioRepository
from app.repositories.audit_log import AuditLogRepository
from app.models.usuario import Usuario

class AuthService:
    @staticmethod
    def login(
        db: Session,
        email: str,
        password: str,
        ip: str
    ) -> tuple[Usuario, str]:
        """
        Autentica un usuario. Genera el token JWT de acceso y
        registra la acción en el AuditLog.
        """
        # Buscar usuario usando el repositorio
        usuario = UsuarioRepository.get_by_email(db, email)
        if not usuario:
            # Mitigar timing attacks forzando una comparación dummy de contraseña
            # (toma un tiempo similar al hashing de Argon2)
            dummy_hash = "$argon2id$v=19$m=65536,t=3,p=4$dummyhashdummyhashdummy"
            verify_password(dummy_hash, "dummy_password")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo electrónico o contraseña incorrectos."
            )

        # Verificar contraseña
        if not verify_password(usuario.password_hash, password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo electrónico o contraseña incorrectos."
            )

        # Generar token JWT
        token, jti = create_access_token(subject=str(usuario.id), role=usuario.rol)

        # Registrar en AuditLog
        AuditLogRepository.create_log(
            db=db,
            usuario_id=usuario.id,
            accion="login",
            entidad="usuario",
            entidad_id=str(usuario.id),
            ip=ip,
            detalle={"email": email}
        )

        return usuario, token

    @staticmethod
    def logout(
        db: Session,
        redis_client: redis.Redis,
        token: str,
        user: Usuario,
        ip: str
    ) -> None:
        """
        Invalida el token JWT agregándolo a la blacklist de Redis y
        registra la acción de logout en el AuditLog.
        """
        payload = decode_access_token(token)
        if payload:
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                # Calcular el tiempo restante de expiración del token para el TTL en Redis
                now = int(datetime.now(timezone.utc).timestamp())
                ttl = exp - now
                if ttl > 0:
                    # Registrar en blacklist de Redis
                    redis_client.setex(f"blacklist:{jti}", ttl, "1")

        # Registrar en AuditLog
        AuditLogRepository.create_log(
            db=db,
            usuario_id=user.id,
            accion="logout",
            entidad="usuario",
            entidad_id=str(user.id),
            ip=ip
        )
