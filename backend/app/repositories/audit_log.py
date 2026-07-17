import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

class AuditLogRepository:
    @staticmethod
    def create_log(
        db: Session,
        usuario_id: Optional[uuid.UUID],
        accion: str,
        entidad: str,
        entidad_id: Optional[str],
        ip: Optional[str],
        detalle: Optional[dict] = None
    ) -> AuditLog:
        """Crea y persiste un registro en el log de auditoría."""
        log = AuditLog(
            usuario_id=usuario_id,
            accion=accion,
            entidad=entidad,
            entidad_id=entidad_id,
            ip=ip,
            detalle=detalle
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
