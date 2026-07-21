import uuid
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_role
from app.models.usuario import Usuario
from app.schemas.audit_log import AuditLogResponse
from app.repositories.audit_log import AuditLogRepository

router = APIRouter(prefix="/audit-logs", tags=["Auditoría"])

@router.get("", response_model=list[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    usuario_id: Optional[uuid.UUID] = None,
    accion: Optional[str] = None,
    entidad: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente", "administrador"]))
):
    """
    Lista los registros de la bitácora transversal de auditoría.
    Requiere rol 'gerente' o 'administrador'.
    """
    return AuditLogRepository.get_all(
        db=db,
        skip=skip,
        limit=limit,
        usuario_id=usuario_id,
        accion=accion,
        entidad=entidad
    )
