import uuid
from typing import Optional
from sqlalchemy import String, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(50), nullable=False)  # 'tecnico_inspector', 'jefe_inspeccion', 'administrador' (soporta también legacy 'coordinador', 'gerente')
    cargo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    firma_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    inspecciones = relationship("Inspeccion", foreign_keys="[Inspeccion.creado_por_id]", back_populates="creado_por")
    audit_logs = relationship("AuditLog", back_populates="usuario")
