import uuid
from sqlalchemy import String, Integer, DateTime, ForeignKey, Index, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class CatalogoChecklist(Base):
    __tablename__ = "catalogo_checklist"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

class Inspeccion(Base):
    __tablename__ = "inspecciones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=False)
    coordinador_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    fecha: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    kilometraje: Mapped[int] = mapped_column(Integer, nullable=False)
    resultado_general: Mapped[str] = mapped_column(String(20), nullable=False)  # 'apto' o 'no_apto'
    mantenimiento_recomendado: Mapped[str] = mapped_column(Text, nullable=True)
    firma_url: Mapped[str] = mapped_column(Text, nullable=False)
    observaciones: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)  # Soft Delete

    # Relaciones
    vehiculo = relationship("Vehiculo", back_populates="inspecciones")
    coordinador = relationship("Usuario", back_populates="inspecciones")
    checklist_items = relationship("ChecklistItem", back_populates="inspeccion", cascade="all, delete-orphan")
    evidencias = relationship("EvidenciaFotografica", back_populates="inspeccion", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_inspeccion_vehiculo_fecha", "vehiculo_id", "fecha"),
    )

class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    catalogo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("catalogo_checklist.id", ondelete="RESTRICT"), nullable=False)
    valor: Mapped[str] = mapped_column(String(20), nullable=False)  # 'bueno', 'regular' o 'malo'

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="checklist_items")
    catalogo = relationship("CatalogoChecklist")
    evidencias = relationship("EvidenciaFotografica", back_populates="checklist_item")

    @property
    def catalogo_nombre(self) -> str | None:
        return self.catalogo.nombre if self.catalogo else None


class EvidenciaFotografica(Base):
    __tablename__ = "evidencias_fotograficas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    checklist_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="evidencias")
    checklist_item = relationship("ChecklistItem", back_populates="evidencias")
