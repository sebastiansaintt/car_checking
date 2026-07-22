import uuid
from typing import Optional
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.notificacion import Notificacion
from app.repositories.notificacion import NotificacionRepository
from app.services.email import EmailService

class NotificacionService:
    @staticmethod
    def notificar_usuario(
        db: Session,
        usuario_id: uuid.UUID,
        tipo: str,
        titulo: str,
        mensaje: str,
        referencia_id: Optional[str] = None,
        referencia_tipo: Optional[str] = None
    ) -> Notificacion:
        """Crea una notificación in-app para un usuario específico."""
        notif = Notificacion(
            usuario_id=usuario_id,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
            referencia_id=referencia_id,
            referencia_tipo=referencia_tipo
        )
        return NotificacionRepository.create(db, notif)

    @staticmethod
    def notificar_por_rol(
        db: Session,
        rol: str,
        tipo: str,
        titulo: str,
        mensaje: str,
        referencia_id: Optional[str] = None,
        referencia_tipo: Optional[str] = None
    ) -> list[Notificacion]:
        """Crea una notificación in-app para todos los usuarios activos con un rol determinado."""
        usuarios = db.query(Usuario).filter(Usuario.rol == rol, Usuario.activo == True).all()
        notifs = []
        for u in usuarios:
            notif = Notificacion(
                usuario_id=u.id,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                referencia_id=referencia_id,
                referencia_tipo=referencia_tipo
            )
            notifs.append(NotificacionRepository.create(db, notif))
        return notifs

    @staticmethod
    def get_notificaciones_usuario(db: Session, usuario_id: uuid.UUID, limit: int = 30) -> list[Notificacion]:
        return NotificacionRepository.get_by_usuario(db, usuario_id, limit)

    @staticmethod
    def get_unread_count(db: Session, usuario_id: uuid.UUID) -> int:
        return NotificacionRepository.count_unread(db, usuario_id)

    @staticmethod
    def marcar_leida(db: Session, notificacion_id: uuid.UUID, usuario_id: uuid.UUID) -> Optional[Notificacion]:
        return NotificacionRepository.mark_as_read(db, notificacion_id, usuario_id)

    @staticmethod
    def marcar_todas_leidas(db: Session, usuario_id: uuid.UUID) -> int:
        return NotificacionRepository.mark_all_as_read(db, usuario_id)
