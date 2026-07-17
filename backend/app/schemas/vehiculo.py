import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel

class VehiculoResponse(BaseModel):
    id: uuid.UUID
    patente: str
    marca: str
    modelo: str
    año: int
    kilometraje_actual: int
    estado: str
    fecha_ultimo_mantenimiento: Optional[date] = None
    fecha_proximo_mantenimiento: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True
