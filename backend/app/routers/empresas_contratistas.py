import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.empresa_contratista import (
    EmpresaContratistaCreate,
    EmpresaContratistaUpdate,
    EmpresaContratistaResponse
)
from app.services.empresa_contratista import EmpresaContratistaService

router = APIRouter(prefix="/empresas-contratistas", tags=["Empresas Contratistas"])

@router.get("", response_model=List[EmpresaContratistaResponse])
def list_empresas_contratistas(
    skip: int = 0,
    limit: int = 100,
    solo_activos: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista empresas contratistas externas. Disponible para todos los usuarios autenticados."""
    return EmpresaContratistaService.list_empresas(db, skip=skip, limit=limit, solo_activos=solo_activos)

@router.post("", response_model=EmpresaContratistaResponse, status_code=status.HTTP_201_CREATED)
def create_empresa_contratista(
    data: EmpresaContratistaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Crea una nueva empresa contratista. Exclusivo para 'administrador'."""
    return EmpresaContratistaService.create_empresa(db, data)

@router.put("/{id}", response_model=EmpresaContratistaResponse)
def update_empresa_contratista(
    id: uuid.UUID,
    data: EmpresaContratistaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Edita una empresa contratista. Exclusivo para 'administrador'."""
    return EmpresaContratistaService.update_empresa(db, id, data)
