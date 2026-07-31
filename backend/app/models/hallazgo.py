import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Hallazgo(Base):
    __tablename__ = "hallazgos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    item_checklist_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("checklist_items.id", ondelete="SET NULL"), nullable=True)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    atendido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_atencion: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="hallazgos")
    item_checklist = relationship("ChecklistItem")
