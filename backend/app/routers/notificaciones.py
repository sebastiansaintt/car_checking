import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.notificacion import (
    NotificacionResponse,
    NotificacionCountResponse
)
from app.services.notificacion import NotificacionService

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])

@router.get("", response_model=list[NotificacionResponse])
def get_notificaciones(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene las notificaciones in-app del usuario autenticado."""
    return NotificacionService.get_notificaciones_usuario(db, current_user.id, limit)

@router.get("/no-leidas/count", response_model=NotificacionCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene el número de notificaciones no leídas para la campana UI."""
    count = NotificacionService.get_unread_count(db, current_user.id)
    return {"unread_count": count}

@router.put("/{id}/leer", response_model=NotificacionResponse)
def marcar_leida(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Marca una notificación específica como leída."""
    notif = NotificacionService.marcar_leida(db, id, current_user.id)
    return notif

@router.put("/leer-todas")
def marcar_todas_leidas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Marca todas las notificaciones del usuario como leídas."""
    count = NotificacionService.marcar_todas_leidas(db, current_user.id)
    return {"message": "Notificaciones marcadas como leídas", "count": count}
