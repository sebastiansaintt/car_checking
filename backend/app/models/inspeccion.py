import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Index, Text, Boolean, func, Sequence
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

inspeccion_num_seq = Sequence('inspeccion_num_seq', start=4800, increment=1)

class CatalogoChecklist(Base):
    __tablename__ = "catalogo_checklist"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sistema_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("catalogo_sistemas.id", ondelete="SET NULL"), nullable=True)
    codigo_item: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Ej. "1.1", "1.2"
    nombre: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    sistema = relationship("CatalogoSistema", back_populates="items")


class Inspeccion(Base):
    __tablename__ = "inspecciones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    numero_inspeccion: Mapped[int] = mapped_column(Integer, inspeccion_num_seq, default=4800, unique=True, index=True, nullable=False)

    numero_revision: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    inspeccion_previa_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inspecciones.id", ondelete="SET NULL"), nullable=True)
    vehiculo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vehiculos.id", ondelete="RESTRICT"), nullable=False)
    empresa_contratista_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("empresas_contratistas.id", ondelete="SET NULL"), nullable=True)
    creado_por_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    hora_inspeccion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    kilometraje: Mapped[int] = mapped_column(Integer, nullable=False)
    area_transitar: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    equipo_auxiliar: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    estado: Mapped[str] = mapped_column(String(30), default="en_revision", nullable=False)  # 'en_revision', 'con_hallazgos', 'pendiente_aprobacion', 'segunda_revision_solicitada', 'aprobado'
    resultado_general: Mapped[str] = mapped_column(String(30), nullable=False)  # 'aprobado', 'con_hallazgos', legacy ('apto'/'no_apto')
    mantenimiento_recomendado: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Aprobación y sello
    fecha_aprobacion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    aprobado_por_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha_proxima_revision: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sello_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)  # Soft Delete

    # Compatibilidad legacy
    @property
    def coordinador_id(self) -> uuid.UUID:
        return self.creado_por_id

    @property
    def firma_url(self) -> str:
        # Retorna la firma del aprobador o de la primera firma
        if self.firmas_tecnicos:
            for f in self.firmas_tecnicos:
                if f.firma_url:
                    return f.firma_url
        return ""

    # Relaciones
    vehiculo = relationship("Vehiculo", back_populates="inspecciones")
    empresa_contratista = relationship("EmpresaContratista", back_populates="inspecciones")
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id], back_populates="inspecciones")
    coordinador = relationship("Usuario", foreign_keys=[creado_por_id], overlaps="creado_por,inspecciones")
    aprobado_por = relationship("Usuario", foreign_keys=[aprobado_por_id])
    
    inspeccion_previa = relationship("Inspeccion", remote_side=[id], backref="revisiones")
    evaluaciones_sistema = relationship("EvaluacionSistema", back_populates="inspeccion", cascade="all, delete-orphan")
    checklist_items = relationship("ChecklistItem", back_populates="inspeccion", cascade="all, delete-orphan")
    hallazgos = relationship("Hallazgo", back_populates="inspeccion", cascade="all, delete-orphan")
    firmas_tecnicos = relationship("FirmaTecnico", back_populates="inspeccion", cascade="all, delete-orphan")
    evidencias = relationship("EvidenciaFotografica", back_populates="inspeccion", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_inspeccion_vehiculo_fecha", "vehiculo_id", "fecha"),
        Index("idx_inspeccion_estado", "estado"),
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    catalogo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("catalogo_checklist.id", ondelete="RESTRICT"), nullable=False)
    valor: Mapped[str] = mapped_column(String(20), nullable=False)  # 'estandar', 'subestandar', 'na' (legacy: 'bueno', 'regular', 'malo')
    comentario: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

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
    checklist_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="evidencias")
    checklist_item = relationship("ChecklistItem", back_populates="evidencias")
