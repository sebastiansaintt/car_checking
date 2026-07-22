import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

class MantenimientoCreate(BaseModel):
    vehiculo_id: uuid.UUID
    tipo: str = Field(..., description="'preventivo' o 'correctivo'")
    descripcion: str = Field(..., min_length=3, description="Descripción del mantenimiento a realizar")
    fecha_limite: date = Field(..., description="Fecha límite para completar el mantenimiento")
    inspeccion_origen_id: Optional[uuid.UUID] = Field(None, description="ID de la inspección que generó esta orden (opcional)")
    observaciones: Optional[str] = None

class MantenimientoUpdate(BaseModel):
    estado: Optional[str] = Field(None, description="'pendiente', 'en_progreso', 'completado', 'vencido'")
    kilometraje_al_completar: Optional[int] = Field(None, ge=0, description="Kilometraje actual cuando se realiza el mantenimiento")
    observaciones: Optional[str] = None

class MantenimientoResponse(BaseModel):
    id: uuid.UUID
    vehiculo_id: uuid.UUID
    coordinador_id: uuid.UUID
    inspeccion_origen_id: Optional[uuid.UUID] = None
    tipo: str
    descripcion: str
    fecha_limite: date
    fecha_completado: Optional[datetime] = None
    kilometraje_al_crear: int
    kilometraje_al_completar: Optional[int] = None
    estado: str
    observaciones: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Datos extendidos para UI
    vehiculo_patente: Optional[str] = None
    vehiculo_modelo: Optional[str] = None
    coordinador_nombre: Optional[str] = None

    class Config:
        from_attributes = True
