import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class FirmaTecnico(Base):
    __tablename__ = "firmas_tecnicos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    inspeccion_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inspecciones.id", ondelete="CASCADE"), nullable=False)
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    nombre_adicional: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    firma_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    es_aprobador: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    signed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relaciones
    inspeccion = relationship("Inspeccion", back_populates="firmas_tecnicos")
    usuario = relationship("Usuario")
