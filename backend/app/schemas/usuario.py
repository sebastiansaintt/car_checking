import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class UsuarioLogin(BaseModel):
    email: str = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., description="Contraseña en texto plano")

class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., description="Correo electrónico del usuario")
    password: str = Field(..., min_length=6, description="Contraseña")
    rol: str = Field("tecnico_inspector", description="Rol del usuario (tecnico_inspector, ingeniero, programador, administrador)")
    cargo: Optional[str] = Field(None, max_length=100)
    firma_url: Optional[str] = Field(None, description="URL o DataURI de la firma del usuario")

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)
    rol: Optional[str] = None
    cargo: Optional[str] = None
    firma_url: Optional[str] = None
    activo: Optional[bool] = None

class UsuarioResponse(BaseModel):
    id: uuid.UUID
    nombre: str
    email: str
    rol: str
    cargo: Optional[str] = None
    firma_url: Optional[str] = None
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True
