import os
import uuid
import json
import shutil
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status, Request, File, UploadFile
from sqlalchemy.orm import Session
import redis

logger = logging.getLogger("uvicorn.error")

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.deps import get_current_user, require_role
from app.models.usuario import Usuario
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
    PresignedUrlRequest,
    PresignedUrlResponse
)
from app.services.inspeccion import InspeccionService
from app.repositories.inspeccion import InspeccionRepository

router = APIRouter(prefix="/inspecciones", tags=["Inspecciones"])

UPLOAD_DIR = "static/uploads"

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
    return InspeccionService.list_inspecciones(
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
    return inspeccion

@router.post("", response_model=InspeccionResponse, status_code=status.HTTP_201_CREATED)
def create_inspeccion(
    data: InspeccionCreate,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "administrador"]))
):
    """
    Crea una nueva inspección técnica.
    Requiere rol 'tecnico_inspector' (o legacy 'coordinador').
    Soporta X-Idempotency-Key para prevenir duplicados en envíos offline/PWA.
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

    res_obj = InspeccionResponse.model_validate(inspeccion).model_dump(mode="json")

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
    Edita la inspección existente tras verificar corrección física de hallazgos.
    Actualiza ítems, incrementa número de revisión, atiende hallazgos y audita la corrección con el decorador.
    """
    return InspeccionService.corregir_inspeccion(
        db=db,
        tecnico=current_user,
        inspeccion_id=id,
        data=data
    )

@router.post("/{id}/aprobar", response_model=InspeccionResponse)
def aprobar_inspeccion(
    id: uuid.UUID,
    data: InspeccionAprobarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["jefe_inspeccion", "gerente", "administrador"]))
):
    """
    RN-11 / ADJ-02: Emite la aprobación final de la inspección.
    Genera el sello digital de Sointer Ltda. y calcula la fecha de próxima revisión.
    Requiere rol 'jefe_inspeccion' (o legacy 'gerente').
    """
    return InspeccionService.aprobar_inspeccion(
        db=db,
        jefe=current_user,
        inspeccion_id=id,
        data=data
    )

@router.post("/{id}/segunda-revision", response_model=InspeccionResponse)
def solicitar_segunda_revision(
    id: uuid.UUID,
    req: SegundaRevisionRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["jefe_inspeccion", "gerente", "administrador"]))
):
    """
    RN-08 / D-01: Solicita una segunda revisión.
    Crea una NUEVA entidad Inspeccion vinculada a la anterior (`inspeccion_previa_id`).
    Requiere rol 'jefe_inspeccion'.
    """
    return InspeccionService.solicitar_segunda_revision(
        db=db,
        jefe=current_user,
        inspeccion_id=id,
        observaciones=req.observaciones
    )

@router.patch("/hallazgos/{hallazgo_id}/atender", response_model=HallazgoResponse)
def marcar_hallazgo_atendido(
    hallazgo_id: uuid.UUID,
    req: HallazgoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["tecnico_inspector", "coordinador", "jefe_inspeccion", "gerente", "administrador"]))
):
    """
    RN-06: Marca un hallazgo como atendido.
    Si se atienden todos los hallazgos de la inspección, cambia su estado a 'pendiente_aprobacion'.
    """
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
    current_user: Usuario = Depends(require_role(["jefe_inspeccion", "gerente", "administrador"]))
):
    """Realiza el Soft Delete de una inspección."""
    ip = request.client.host if request.client else "unknown"
    InspeccionService.delete_inspeccion(
        db=db,
        coordinador=current_user,
        inspeccion_id=id,
        ip=ip
    )
    return {"message": "Inspección eliminada correctamente."}

# Mock presigned URL endpoints
@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_url(
    req: PresignedUrlRequest,
    current_user: Usuario = Depends(get_current_user)
):
    ext = os.path.splitext(req.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"

    return {
        "upload_url": f"/api/inspecciones/mock-s3-upload?filename={unique_filename}",
        "file_url": f"/static/uploads/{unique_filename}"
    }

@router.post("/mock-s3-upload")
def mock_s3_upload(
    filename: str,
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_user)
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {e}"
        )
    finally:
        file.file.close()

    return {"message": "Archivo subido correctamente", "filename": filename}
