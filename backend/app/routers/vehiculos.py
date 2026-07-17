from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.vehiculo import VehiculoResponse
from app.repositories.vehiculo import VehiculoRepository
from app.models.usuario import Usuario

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])

@router.get("", response_model=list[VehiculoResponse])
def get_vehiculos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista todos los vehículos registrados y activos en el sistema."""
    return VehiculoRepository.get_all_active(db)
