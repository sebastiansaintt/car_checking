import uuid
from sqlalchemy import String, Integer, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Vehiculo(Base):
    __tablename__ = "vehiculos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patente: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    marca: Mapped[str] = mapped_column(String(50), nullable=False)
    modelo: Mapped[str] = mapped_column(String(50), nullable=False)
    año: Mapped[int] = mapped_column(Integer, nullable=False)
    kilometraje_actual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="activo", nullable=False)  # 'activo' o 'inactivo'
    fecha_ultimo_mantenimiento: Mapped[Date] = mapped_column(Date, nullable=True)
    fecha_proximo_mantenimiento: Mapped[Date] = mapped_column(Date, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    inspecciones = relationship("Inspeccion", back_populates="vehiculo")
