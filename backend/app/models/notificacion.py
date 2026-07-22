import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    # 'inspeccion_creada', 'mantenimiento_creado', 'mantenimiento_proximo', 'mantenimiento_vencido', 'mantenimiento_completado', 'inspeccion_editada', 'inspeccion_eliminada'
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    mensaje: Mapped[str] = mapped_column(Text, nullable=False)
    referencia_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    referencia_tipo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'inspeccion', 'mantenimiento', 'vehiculo'
    leida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    usuario = relationship("Usuario")

    __table_args__ = (
        Index("idx_notif_usuario_leida", "usuario_id", "leida", "created_at"),
    )
