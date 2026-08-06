import os
import uuid
import json
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
import redis

logger = logging.getLogger("uvicorn.error")

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.models.inspeccion import Inspeccion
from app.models.vehiculo import Vehiculo
from app.schemas.inspeccion import (
    CatalogoSistemaResponse,
    CatalogoChecklistResponse,
    InspeccionCreate,
    InspeccionUpdate,
    InspeccionResponse,
    InspeccionAprobarRequest,
    SegundaRevisionRequest,
    HallazgoResponse,
    HallazgoUpdate,
    CheckPlacaResponse,
    VehiculoInspeccionadoResponse
)
from app.services.inspeccion import InspeccionService
from app.repositories.inspeccion import InspeccionRepository

router = APIRouter(prefix="/inspecciones", tags=["Inspecciones"])


@router.get("/sistemas-catalog", response_model=List[CatalogoSistemaResponse])
def get_sistemas_catalog(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna los 9 sistemas maestros del catálogo."""
    return InspeccionRepository.get_sistemas_catalog(db)


@router.get("/checklist-catalog", response_model=List[CatalogoChecklistResponse])
def get_checklist_catalog(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna los ítems maestros del checklist."""
    return InspeccionRepository.get_checklist_catalog(db)


@router.get("/check-placa/{placa}", response_model=CheckPlacaResponse)
def check_placa(
    placa: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "administrador"]))
):
    """
    Verifica si una placa tiene un registro primario activo registrado previamente.
    Retorna si existe y los datos de dicho registro primario.
    """
    primario = InspeccionRepository.get_primario_by_placa(db, placa)
    if primario:
        resp = InspeccionResponse.model_validate(primario)
        return CheckPlacaResponse(tiene_registro_primario=True, registro_primario=resp)
    return CheckPlacaResponse(tiene_registro_primario=False, registro_primario=None)


@router.get("/vehiculos-inspeccionados", response_model=List[VehiculoInspeccionadoResponse])
def get_vehiculos_inspeccionados(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna la lista de vehículos que han sido inspeccionados, con totales y fecha/técnico de la última inspección.
    """
    vehiculos = db.query(Vehiculo).join(Inspeccion).filter(Inspeccion.deleted_at.is_(None)).all()
    
    resultado = []
    for v in vehiculos:
        insps = db.query(Inspeccion).options(joinedload(Inspeccion.creado_por)).filter(
            Inspeccion.vehiculo_id == v.id,
            Inspeccion.deleted_at.is_(None)
        ).order_by(Inspeccion.fecha.desc()).all()
        
        if not insps:
            continue

        ultima = insps[0]
        resultado.append(
            VehiculoInspeccionadoResponse(
                placa=v.patente,
                marca=v.marca,
                modelo=v.modelo,
                año=v.año,
                kilometraje=ultima.kilometraje,
                total_inspecciones=len(insps),
                ultima_fecha=ultima.fecha,
                nombre_tecnico_ultimo=ultima.creado_por.nombre if ultima.creado_por else "N/A",
                equipo_auxiliar=ultima.equipo_auxiliar or v.equipo_auxiliar,
                numero_interno=v.numero_interno
            )
        )
    return resultado


@router.get("", response_model=List[InspeccionResponse])
def get_inspecciones(
    skip: int = 0,
    limit: int = 100,
    vehiculo_id: Optional[uuid.UUID] = None,
    empresa_contratista_id: Optional[uuid.UUID] = None,
    coordinador_id: Optional[uuid.UUID] = None,
    estado: Optional[str] = None,
    resultado_general: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista las inspecciones activas aplicando filtros opcionales."""
    inspecciones = InspeccionService.list_inspecciones(
        db=db,
        skip=skip,
        limit=limit,
        vehiculo_id=vehiculo_id,
        empresa_contratista_id=empresa_contratista_id,
        coordinador_id=coordinador_id,
        estado=estado,
        resultado_general=resultado_general,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )
    
    # Mapear campo es_subregistro
    resp_list = []
    for insp in inspecciones:
        dto = InspeccionResponse.model_validate(insp)
        dto.es_subregistro = insp.inspeccion_primaria_id is not None
        resp_list.append(dto)
    return resp_list


@router.get("/{id}", response_model=InspeccionResponse)
def get_inspeccion_by_id(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene el detalle completo de una inspección por ID."""
    inspeccion = InspeccionRepository.get_by_id(db, id)
    if not inspeccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La inspección seleccionada no existe."
        )
    dto = InspeccionResponse.model_validate(inspeccion)
    dto.es_subregistro = inspeccion.inspeccion_primaria_id is not None
    return dto


@router.post("", response_model=InspeccionResponse, status_code=status.HTTP_201_CREATED)
def create_inspeccion(
    data: InspeccionCreate,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "administrador"]))
):
    """
    Crea una nueva inspección técnica o subregistro.
    Requiere rol 'tecnico_inspector'.
    Soporta X-Idempotency-Key.
    """
    if x_idempotency_key:
        cached_res = None
        try:
            cached_res = redis_client.get(f"idempotency:{x_idempotency_key}")
        except redis.RedisError as e:
            logger.warning(f"Error al leer idempotencia de Redis: {e}")

        if cached_res:
            try:
                return json.loads(cached_res)
            except Exception:
                pass

    inspeccion = InspeccionService.create_inspeccion(
        db=db,
        tecnico=current_user,
        data=data
    )

    res_dto = InspeccionResponse.model_validate(inspeccion)
    res_dto.es_subregistro = inspeccion.inspeccion_primaria_id is not None
    res_obj = res_dto.model_dump(mode="json")

    if x_idempotency_key:
        try:
            redis_client.setex(
                f"idempotency:{x_idempotency_key}",
                300,
                json.dumps(res_obj)
            )
        except redis.RedisError as e:
            logger.warning(f"Error al guardar idempotencia en Redis: {e}")

    return res_obj


@router.put("/{id}/corregir", response_model=InspeccionResponse)
def corregir_inspeccion(
    id: uuid.UUID,
    data: InspeccionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "administrador"]))
):
    """
    Crea una nueva inspección como subregistro para mantener el historial inmutable.
    """
    subregistro = InspeccionService.corregir_inspeccion(
        db=db,
        tecnico=current_user,
        inspeccion_id=id,
        data=data
    )
    dto = InspeccionResponse.model_validate(subregistro)
    dto.es_subregistro = True
    return dto


@router.post("/{id}/aprobar", response_model=InspeccionResponse)
def aprobar_inspeccion(
    id: uuid.UUID,
    data: InspeccionAprobarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["ingeniero", "jefe_inspeccion", "gerente", "administrador"]))
):
    """
    Emite la aprobación final de la inspección.
    Requiere rol 'ingeniero' (o legacy 'jefe_inspeccion' / 'gerente').
    """
    inspeccion = InspeccionService.aprobar_inspeccion(
        db=db,
        jefe=current_user,
        inspeccion_id=id,
        data=data
    )
    dto = InspeccionResponse.model_validate(inspeccion)
    dto.es_subregistro = inspeccion.inspeccion_primaria_id is not None
    return dto


@router.patch("/hallazgos/{hallazgo_id}/atender", response_model=HallazgoResponse)
def marcar_hallazgo_atendido(
    hallazgo_id: uuid.UUID,
    req: HallazgoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "ingeniero", "jefe_inspeccion", "gerente", "administrador"]))
):
    """Marca un hallazgo como atendido."""
    return InspeccionService.marcar_hallazgo_atendido(
        db=db,
        usuario=current_user,
        hallazgo_id=hallazgo_id
    )


@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_inspeccion(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["administrador"]))
):
    """Soft Delete de una inspección. Exclusivo para Administrador."""
    inspeccion = InspeccionRepository.get_by_id(db, id)
    if not inspeccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La inspección a eliminar no existe."
        )
    InspeccionRepository.soft_delete(db, inspeccion)
    return {"message": "Inspección eliminada correctamente."}
