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

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        usuario_id: Optional[uuid.UUID] = None,
        accion: Optional[str] = None,
        entidad: Optional[str] = None
    ) -> list[AuditLog]:
        """Consulta registros de auditoría aplicando filtros opcionales."""
        query = db.query(AuditLog)
        if usuario_id:
            query = query.filter(AuditLog.usuario_id == usuario_id)
        if accion:
            query = query.filter(AuditLog.accion == accion)
        if entidad:
            query = query.filter(AuditLog.entidad == entidad)
            
        return query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
