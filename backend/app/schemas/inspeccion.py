import uuid
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# --- Catalog Schemas ---
class CatalogoSistemaResponse(BaseModel):
    id: uuid.UUID
    codigo: str
    nombre: str
    orden: int
    activo: bool

    class Config:
        from_attributes = True

class CatalogoChecklistResponse(BaseModel):
    id: uuid.UUID
    sistema_id: Optional[uuid.UUID] = None
    codigo_item: Optional[str] = None
    nombre: str
    descripcion: Optional[str] = None
    activo: bool

    class Config:
        from_attributes = True

# --- Evaluaciones & Checklist Items ---
class ChecklistItemCreate(BaseModel):
    catalogo_id: uuid.UUID = Field(..., description="ID del ítem del catálogo")
    valor: str = Field(..., description="Valor: 'estandar', 'subestandar' o 'na'")
    comentario: Optional[str] = Field(None, description="Comentario o aclaración opcional por ítem")

class ChecklistItemResponse(BaseModel):
    id: uuid.UUID
    catalogo_id: uuid.UUID
    valor: str
    comentario: Optional[str] = None
    catalogo_nombre: Optional[str] = None

    class Config:
        from_attributes = True

class EvaluacionSistemaResponse(BaseModel):
    id: uuid.UUID
    sistema_id: uuid.UUID
    estado_sistema: str  # 'aprobado', 'no_aprobado'
    sistema_nombre: Optional[str] = None
    sistema_codigo: Optional[str] = None

    class Config:
        from_attributes = True

# --- Hallazgos ---
class HallazgoResponse(BaseModel):
    id: uuid.UUID
    inspeccion_id: uuid.UUID
    item_checklist_id: Optional[uuid.UUID] = None
    descripcion: str
    atendido: bool
    fecha_atencion: Optional[date] = None
    created_at: datetime

    class Config:
        from_attributes = True

class HallazgoUpdate(BaseModel):
    atendido: bool = Field(..., description="Marcar hallazgo como atendido (True)")

# --- Firmas Técnicos ---
class FirmaTecnicoCreate(BaseModel):
    nombre_adicional: Optional[str] = Field(None, description="Nombre de técnico adicional (sin login)")

class FirmaTecnicoResponse(BaseModel):
    id: uuid.UUID
    inspeccion_id: uuid.UUID
    usuario_id: Optional[uuid.UUID] = None
    usuario_nombre: Optional[str] = None
    nombre_adicional: Optional[str] = None
    firma_url: Optional[str] = None
    es_aprobador: bool
    signed_at: datetime

    class Config:
        from_attributes = True

# --- Evidencias Fotográficas ---
class EvidenciaFotograficaCreate(BaseModel):
    url: str = Field(..., description="URL de la imagen")
    checklist_item_id: Optional[uuid.UUID] = Field(None, description="ID del ítem relacionado")
    descripcion: Optional[str] = Field(None, description="Descripción del daño")

class EvidenciaFotograficaResponse(BaseModel):
    id: uuid.UUID
    url: str
    checklist_item_id: Optional[uuid.UUID] = None
    descripcion: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Inspección Requests & Responses ---
class InspeccionCreate(BaseModel):
    # Identificación del Vehículo (Alta dinámica por placa - ADJ-01)
    placa: str = Field(..., min_length=3, max_length=20, description="Placa del vehículo")
    empresa_contratista_id: Optional[uuid.UUID] = Field(None, description="ID de la empresa contratista propietaria")
    marca: str = Field(..., description="Marca del vehículo")
    modelo: str = Field(..., description="Modelo del vehículo")
    año: int = Field(..., ge=1990, le=2030, description="Año de fabricación")
    tipo_vehiculo: Optional[str] = Field("Camioneta", description="Tipo de vehículo")
    numero_interno: Optional[str] = Field(None, description="Número interno contratista")
    color: Optional[str] = Field(None, description="Color del vehículo")
    equipo_auxiliar: Optional[str] = Field(None, description="Equipo auxiliar si aplica")
    area_transitar: Optional[str] = Field(None, description="Área a transitar (ej. Mina)")
    
    kilometraje: int = Field(..., ge=0, description="Kilometraje actual")
    hora_inspeccion: Optional[str] = Field(None, description="Hora de inspección en campo")

    mantenimiento_recomendado: Optional[str] = None
    observaciones: Optional[str] = None

    # Firmas (Técnico logueado + hasta 2 adicionales — RN-10)
    firma_url: str = Field(..., description="Firma digital del técnico inspector logueado")
    nombres_tecnicos_adicionales: List[str] = Field(default=[], max_items=2, description="Nombres de hasta 2 técnicos adicionales")

    # Evaluaciones
    checklist_items: List[ChecklistItemCreate] = Field(..., min_items=1, description="Lista de evaluaciones por ítem")
    evidencias: List[EvidenciaFotograficaCreate] = Field(default=[], description="Evidencias fotográficas")

class InspeccionUpdate(BaseModel):
    kilometraje: Optional[int] = Field(None, ge=0)
    mantenimiento_recomendado: Optional[str] = None
    observaciones: Optional[str] = None

class InspeccionAprobarRequest(BaseModel):
    firma_url: str = Field(..., description="Firma digital del Jefe de Inspección al aprobar")

class SegundaRevisionRequest(BaseModel):
    observaciones: Optional[str] = Field(None, description="Observaciones o justificativo para la segunda revisión")

class InspeccionResponse(BaseModel):
    id: uuid.UUID
    numero_inspeccion: int
    numero_revision: int
    inspeccion_previa_id: Optional[uuid.UUID] = None
    vehiculo_id: uuid.UUID
    vehiculo_patente: Optional[str] = None
    vehiculo_modelo: Optional[str] = None
    empresa_contratista_id: Optional[uuid.UUID] = None
    empresa_contratista_nombre: Optional[str] = None
    creado_por_id: uuid.UUID
    creado_por_nombre: Optional[str] = None

    fecha: datetime
    hora_inspeccion: Optional[str] = None
    kilometraje: int
    area_transitar: Optional[str] = None
    equipo_auxiliar: Optional[str] = None

    estado: str  # 'en_revision', 'con_hallazgos', 'pendiente_aprobacion', 'segunda_revision_solicitada', 'aprobado'
    resultado_general: str  # 'aprobado', 'con_hallazgos'
    mantenimiento_recomendado: Optional[str] = None
    observaciones: Optional[str] = None

    fecha_aprobacion: Optional[datetime] = None
    aprobado_por_id: Optional[uuid.UUID] = None
    aprobado_por_nombre: Optional[str] = None
    fecha_proxima_revision: Optional[date] = None
    sello_url: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    evaluaciones_sistema: List[EvaluacionSistemaResponse] = []
    checklist_items: List[ChecklistItemResponse] = []
    hallazgos: List[HallazgoResponse] = []
    firmas_tecnicos: List[FirmaTecnicoResponse] = []
    evidencias: List[EvidenciaFotograficaResponse] = []

    class Config:
        from_attributes = True

class PresignedUrlRequest(BaseModel):
    filename: str = Field(..., description="Nombre del archivo original")

class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_url: str
