import uuid
from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.mantenimiento import (
    MantenimientoCreate,
    MantenimientoUpdate,
    MantenimientoResponse
)
from app.services.mantenimiento import MantenimientoService

router = APIRouter(prefix="/mantenimientos", tags=["Mantenimientos"])

@router.get("", response_model=list[MantenimientoResponse])
def list_mantenimientos(
    skip: int = 0,
    limit: int = 100,
    vehiculo_id: Optional[uuid.UUID] = None,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista las órdenes de mantenimiento registradas."""
    return MantenimientoService.list_mantenimientos(
        db=db, skip=skip, limit=limit, vehiculo_id=vehiculo_id, tipo=tipo, estado=estado
    )

@router.post("", response_model=MantenimientoResponse, status_code=status.HTTP_201_CREATED)
def create_mantenimiento(
    data: MantenimientoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["coordinador"]))
):
    """Crea una orden de mantenimiento. Requiere rol 'coordinador'."""
    return MantenimientoService.crear_orden(db=db, coordinador=current_user, data=data)

@router.put("/{id}", response_model=MantenimientoResponse)
def update_mantenimiento(
    id: uuid.UUID,
    data: MantenimientoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["coordinador"]))
):
    """Actualiza el estado u observaciones de una orden de mantenimiento. Requiere rol 'coordinador'."""
    return MantenimientoService.actualizar_orden(db=db, coordinador=current_user, mantenimiento_id=id, data=data)

@router.post("/verificar-vencimientos")
def verificar_vencimientos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Ejecuta la revisión periódica de mantenimientos próximos y vencidos."""
    return MantenimientoService.verificar_vencimientos(db)
