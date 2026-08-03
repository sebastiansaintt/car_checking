import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_role
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.services.usuario import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.get("", response_model=List[UsuarioResponse])
def list_usuarios(
    skip: int = 0,
    limit: int = 100,
    solo_activos: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Lista todos los usuarios registrados. Exclusivo para 'administrador'."""
    return UsuarioService.list_usuarios(db, skip=skip, limit=limit, solo_activos=solo_activos)

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Crea un nuevo usuario (técnico inspector, jefe de inspección o admin). Exclusivo para 'administrador'."""
    return UsuarioService.create_usuario(db, data)

@router.put("/{id}", response_model=UsuarioResponse)
def update_usuario(
    id: uuid.UUID,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Actualiza datos, rol o estado activo de un usuario. Exclusivo para 'administrador'."""
    return UsuarioService.update_usuario(db, id, data)
