import uuid
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class EmpresaContratista(Base):
    __tablename__ = "empresas_contratistas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    rut: Mapped[str] = mapped_column(String(50), nullable=True)
    contacto: Mapped[str] = mapped_column(String(100), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    vehiculos = relationship("Vehiculo", back_populates="empresa_contratista")
    inspecciones = relationship("Inspeccion", back_populates="empresa_contratista")
