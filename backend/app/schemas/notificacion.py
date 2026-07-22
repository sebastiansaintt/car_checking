import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class NotificacionResponse(BaseModel):
    id: uuid.UUID
    usuario_id: uuid.UUID
    tipo: str
    titulo: str
    mensaje: str
    referencia_id: Optional[str] = None
    referencia_tipo: Optional[str] = None
    leida: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificacionCountResponse(BaseModel):
    unread_count: int
