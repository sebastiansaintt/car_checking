from app.core.database import Base
from app.models.usuario import Usuario
from app.models.vehiculo import Vehiculo
from app.models.inspeccion import CatalogoChecklist, Inspeccion, ChecklistItem, EvidenciaFotografica
from app.models.audit_log import AuditLog
from app.models.mantenimiento import Mantenimiento
from app.models.notificacion import Notificacion

__all__ = [
    "Base",
    "Usuario",
    "Vehiculo",
    "CatalogoChecklist",
    "Inspeccion",
    "ChecklistItem",
    "EvidenciaFotografica",
    "AuditLog",
    "Mantenimiento",
    "Notificacion"
]

