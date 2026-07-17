import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class CatalogoChecklistResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    descripcion: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True

class ChecklistItemCreate(BaseModel):
    catalogo_id: uuid.UUID = Field(..., description="ID del item del catálogo")
    valor: str = Field(..., description="Valor: 'bueno', 'regular' o 'malo'")

class ChecklistItemResponse(BaseModel):
    id: uuid.UUID
    catalogo_id: uuid.UUID
    valor: str
    catalogo_nombre: Optional[str] = None  # Resuelto para facilitar la UI

    class Config:
        from_attributes = True

class EvidenciaFotograficaCreate(BaseModel):
    url: str = Field(..., description="URL de la imagen (retornada por el mock upload)")
    checklist_item_id: Optional[uuid.UUID] = Field(None, description="ID del item de checklist relacionado, opcional")
    descripcion: Optional[str] = Field(None, description="Descripción opcional del daño/estado")

class EvidenciaFotograficaResponse(BaseModel):
    id: uuid.UUID
    url: str
    checklist_item_id: Optional[uuid.UUID]
    descripcion: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class InspeccionCreate(BaseModel):
    vehiculo_id: uuid.UUID
    kilometraje: int = Field(..., ge=0, description="Kilometraje actual registrado en la inspección")
    resultado_general: str = Field(..., description="Resultado general: 'apto' o 'no_apto'")
    mantenimiento_recomendado: Optional[str] = None
    firma_url: str = Field(..., description="URL de la firma del coordinador")
    observaciones: Optional[str] = None
    checklist_items: list[ChecklistItemCreate] = Field(..., min_items=1, description="Lista de evaluaciones individuales")
    evidencias: list[EvidenciaFotograficaCreate] = Field(default=[], description="Evidencias fotográficas adjuntas")

class InspeccionUpdate(BaseModel):
    kilometraje: Optional[int] = Field(None, ge=0)
    resultado_general: Optional[str] = None
    mantenimiento_recomendado: Optional[str] = None
    firma_url: Optional[str] = None
    observaciones: Optional[str] = None
    checklist_items: Optional[list[ChecklistItemCreate]] = None
    evidencias: Optional[list[EvidenciaFotograficaCreate]] = None

class InspeccionResponse(BaseModel):
    id: uuid.UUID
    vehiculo_id: uuid.UUID
    coordinador_id: uuid.UUID
    fecha: datetime
    kilometraje: int
    resultado_general: str
    mantenimiento_recomendado: Optional[str] = None
    firma_url: str
    observaciones: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    checklist_items: list[ChecklistItemResponse] = []
    evidencias: list[EvidenciaFotograficaResponse] = []

    class Config:
        from_attributes = True

class PresignedUrlRequest(BaseModel):
    filename: str = Field(..., description="Nombre del archivo original")

class PresignedUrlResponse(BaseModel):
    upload_url: str = Field(..., description="URL a la que se debe subir el archivo")
    file_url: str = Field(..., description="URL pública final del archivo tras subirse")
