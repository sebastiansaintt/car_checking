import uuid
from sqlalchemy import String, DateTime, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    accion: Mapped[str] = mapped_column(String(50), nullable=False)  # 'crear', 'editar', 'eliminar', 'exportar', 'login', 'logout'
    entidad: Mapped[str] = mapped_column(String(50), nullable=False)  # 'vehiculo', 'inspeccion', etc.
    entidad_id: Mapped[str] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ip: Mapped[str] = mapped_column(String(45), nullable=True)  # Soporta IPv4 e IPv6
    detalle: Mapped[dict] = mapped_column(JSONB, nullable=True)  # Diferencias antes/después

    # Relaciones
    usuario = relationship("Usuario", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_log_usuario_timestamp", "usuario_id", "timestamp"),
    )
