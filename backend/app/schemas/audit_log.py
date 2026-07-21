import uuid
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    accion: str
    entidad: str
    entidad_id: Optional[str] = None
    ip: Optional[str] = None
    detalle: Optional[Any] = None
    timestamp: datetime

    class Config:
        from_attributes = True
