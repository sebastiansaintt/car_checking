import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class EmpresaContratistaCreate(BaseModel):
    nombre: str = Field(..., max_length=150, description="Nombre de la empresa contratista")
    rut: Optional[str] = Field(None, max_length=50, description="RUT o identificación fiscal")
    contacto: Optional[str] = Field(None, max_length=100, description="Persona de contacto o email")

class EmpresaContratistaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=150)
    rut: Optional[str] = Field(None, max_length=50)
    contacto: Optional[str] = Field(None, max_length=100)
    activo: Optional[bool] = None

class EmpresaContratistaResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    rut: Optional[str] = None
    contacto: Optional[str] = None
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True
