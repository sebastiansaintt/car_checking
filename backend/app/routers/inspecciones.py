import os
import uuid
import json
import shutil
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status, Request, File, UploadFile
from sqlalchemy.orm import Session
import redis

from app.core.database import get_db
from app.core.redis_client import get_redis
from app.deps import get_current_user, require_role
from app.models.usuario import Usuario
from app.schemas.inspeccion import (
    CatalogoChecklistResponse,
    InspeccionCreate,
    InspeccionUpdate,
    InspeccionResponse,
    PresignedUrlRequest,
    PresignedUrlResponse
)
from app.services.inspeccion import InspeccionService
from app.repositories.inspeccion import InspeccionRepository

router = APIRouter(prefix="/inspecciones", tags=["Inspecciones"])

# Directorio de subidas estáticas local para simular S3
UPLOAD_DIR = "static/uploads"

@router.get("/checklist-catalog", response_model=list[CatalogoChecklistResponse])
def get_checklist_catalog(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Retorna la lista de ítems maestros del checklist."""
    return InspeccionRepository.get_checklist_catalog(db)

@router.get("", response_model=list[InspeccionResponse])
def get_inspecciones(
    skip: int = 0,
    limit: int = 100,
    vehiculo_id: Optional[uuid.UUID] = None,
    coordinador_id: Optional[uuid.UUID] = None,
    resultado_general: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Lista los reportes de inspección activos (no eliminados) aplicando filtros opcionales. Acceso para ambos roles."""
    return InspeccionService.list_inspecciones(
        db=db,
        skip=skip,
        limit=limit,
        vehiculo_id=vehiculo_id,
        coordinador_id=coordinador_id,
        resultado_general=resultado_general,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

@router.post("", response_model=InspeccionResponse, status_code=status.HTTP_201_CREATED)
def create_inspeccion(
    data: InspeccionCreate,
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    db: Session = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis),
    current_user: Usuario = Depends(require_role(["coordinador"])) # Regla no negociable: Validar rol en el backend
):
    """
    Crea un reporte de inspección. Requiere rol 'coordinador'.
    Soporta Idempotency Key en cabeceras para evitar duplicidad de envíos.
    """
    if x_idempotency_key:
        # Verificar si la clave de idempotencia existe en Redis
        cached_res = redis_client.get(f"idempotency:{x_idempotency_key}")
        if cached_res:
            try:
                # Retornar la respuesta cacheada
                return json.loads(cached_res)
            except Exception:
                pass

    # Crear inspección usando el servicio de negocio
    inspeccion = InspeccionService.create_inspeccion(
        db=db,
        coordinador=current_user,
        data=data
    )

    # Serializar la respuesta para la validación y el caché de idempotencia
    # Usamos Pydantic para asegurar que la respuesta calza con el esquema esperado
    res_obj = InspeccionResponse.model_validate(inspeccion).model_dump(mode="json")

    if x_idempotency_key:
        # Guardar en Redis por 5 minutos (300 segundos) para prevenir reintentos
        redis_client.setex(
            f"idempotency:{x_idempotency_key}", 
            300, 
            json.dumps(res_obj)
        )

    return res_obj

@router.put("/{id}", response_model=InspeccionResponse)
def update_inspeccion(
    id: uuid.UUID,
    data: InspeccionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["coordinador"])) # Regla no negociable: Validar rol en el backend
):
    """Edita un reporte de inspección existente. Requiere rol 'coordinador'."""
    ip = request.client.host if request.client else "unknown"
    return InspeccionService.update_inspeccion(
        db=db,
        coordinador=current_user,
        inspeccion_id=id,
        data=data,
        ip=ip
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_inspeccion(
    id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role(["coordinador"])) # Regla no negociable: Validar rol en el backend
):
    """Realiza la eliminación lógica (soft delete) de una inspección. Requiere rol 'coordinador'."""
    ip = request.client.host if request.client else "unknown"
    InspeccionService.delete_inspeccion(
        db=db,
        coordinador=current_user,
        inspeccion_id=id,
        ip=ip
    )
    return {"message": "Inspección eliminada correctamente."}

# --- ENDPOINTS PARA MOCK DE ALMACENAMIENTO S3 ---

@router.post("/presigned-url", response_model=PresignedUrlResponse)
def get_presigned_url(
    req: PresignedUrlRequest,
    current_user: Usuario = Depends(get_current_user)
):
    """
    Simula la generación de una URL firmada de S3/R2.
    Retorna la URL a la que se debe subir el archivo (nuestro endpoint local de mock-upload)
    y la URL final de descarga que tendrá el archivo.
    """
    # Generar un nombre de archivo único
    ext = os.path.splitext(req.filename)[1]
    unique_filename = f"{uuid.uuid4()}{ext}"

    # Retorna URLs locales
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
    """
    Endpoint que simula la subida directa del frontend a S3.
    Guarda el archivo en el almacenamiento local estático de la API.
    """
    # Asegurar que el directorio de destino exista
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
