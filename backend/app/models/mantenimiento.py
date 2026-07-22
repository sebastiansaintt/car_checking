import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Mantenimiento(Base):
    __tablename__ = "mantenimientos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=False)
    coordinador_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    inspeccion_origen_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inspecciones.id", ondelete="SET NULL"), nullable=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # 'preventivo' o 'correctivo'
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_limite: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_completado: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    kilometraje_al_crear: Mapped[int] = mapped_column(Integer, nullable=False)
    kilometraje_al_completar: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="pendiente", nullable=False)  # 'pendiente', 'en_progreso', 'completado', 'vencido'
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relaciones
    vehiculo = relationship("Vehiculo", back_populates="mantenimientos")
    coordinador = relationship("Usuario")
    inspeccion_origen = relationship("Inspeccion")

    __table_args__ = (
        Index("idx_mant_vehiculo_estado", "vehiculo_id", "estado"),
    )
