import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class EvaluacionSistema(Base):
    __tablename__ = "evaluaciones_sistema"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    sistema_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("catalogo_sistemas.id", ondelete="RESTRICT"), nullable=False)
    estado_sistema: Mapped[str] = mapped_column(String(20), nullable=False)  # 'aprobado', 'no_aprobado', 'na'

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="evaluaciones_sistema")
    sistema = relationship("CatalogoSistema", back_populates="evaluaciones")
