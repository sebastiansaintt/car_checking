import uuid
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patente: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)  # Placa
    empresa_contratista_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas_contratistas.id", ondelete="SET NULL"), nullable=True)
    marca: Mapped[str] = mapped_column(String(50), nullable=False)
    modelo: Mapped[str] = mapped_column(String(50), nullable=False)
    año: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo_vehiculo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    numero_interno: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    equipo_auxiliar: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    area_transitar: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    kilometraje_actual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="activo", nullable=False)  # 'activo' o 'inactivo'
    fecha_ultimo_mantenimiento: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    fecha_proximo_mantenimiento: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    empresa_contratista = relationship("EmpresaContratista", back_populates="vehiculos")
    inspecciones = relationship("Inspeccion", back_populates="vehiculo")
