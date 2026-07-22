import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.notificacion import Notificacion

class NotificacionRepository:
    @staticmethod
    def get_by_usuario(db: Session, usuario_id: uuid.UUID, limit: int = 30) -> list[Notificacion]:
        return db.query(Notificacion)\
            .filter(Notificacion.usuario_id == usuario_id)\
            .order_by(Notificacion.created_at.desc())\
            .limit(limit).all()

    @staticmethod
    def count_unread(db: Session, usuario_id: uuid.UUID) -> int:
        return db.query(Notificacion)\
            .filter(Notificacion.usuario_id == usuario_id, Notificacion.leida == False)\
            .count()

    @staticmethod
    def mark_as_read(db: Session, notificacion_id: uuid.UUID, usuario_id: uuid.UUID) -> Optional[Notificacion]:
        notif = db.query(Notificacion)\
            .filter(Notificacion.id == notificacion_id, Notificacion.usuario_id == usuario_id).first()
        if notif:
            notif.leida = True
            db.add(notif)
            db.commit()
            db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_as_read(db: Session, usuario_id: uuid.UUID) -> int:
        count = db.query(Notificacion)\
            .filter(Notificacion.usuario_id == usuario_id, Notificacion.leida == False)\
            .update({"leida": True}, synchronize_session=False)
        db.commit()
        return count

    @staticmethod
    def create(db: Session, notificacion: Notificacion) -> Notificacion:
        db.add(notificacion)
        db.commit()
        db.refresh(notificacion)
        return notificacion
