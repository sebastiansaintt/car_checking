from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import require_role
from app.models.usuario import Usuario
from app.repositories.estadisticas import EstadisticasRepository

router = APIRouter(prefix="/estadisticas", tags=["Estadísticas"])

@router.get("/kpi-resumen")
def get_kpi_resumen(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene los KPIs clave de la flota para el gerente."""
    return EstadisticasRepository.get_kpi_resumen(db)

@router.get("/inspecciones-por-mes")
def get_inspecciones_por_mes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene la tendencia de inspecciones de los últimos meses."""
    return EstadisticasRepository.get_inspecciones_por_mes(db)

@router.get("/distribucion-resultados")
def get_distribucion_resultados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene la proporción de aptos vs no aptos."""
    return EstadisticasRepository.get_distribucion_resultados(db)

@router.get("/top-vehiculos")
def get_top_vehiculos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene los vehículos con mayor cantidad de inspecciones."""
    return EstadisticasRepository.get_top_vehiculos_inspeccionados(db)

@router.get("/items-problematicos")
def get_items_problematicos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene los ítems del checklist con mayor tasa de falla (malo/regular)."""
    return EstadisticasRepository.get_items_mas_fallados(db)

@router.get("/mantenimientos-resumen")
def get_mantenimientos_resumen(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["gerente"]))
):
    """Obtiene el resumen de mantenimientos por estado."""
    return EstadisticasRepository.get_mantenimientos_por_estado(db)
