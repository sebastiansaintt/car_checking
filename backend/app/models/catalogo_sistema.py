import uuid
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class CatalogoSistema(Base):
    __tablename__ = "catalogo_sistemas"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column(String(10), unique=True, index=True, nullable=False)  # Ej. "1", "2" ... "9"
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)  # Ej. "SISTEMA DE DIRECCIÓN"
    orden: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relaciones
    items = relationship("CatalogoChecklist", back_populates="sistema", order_by="CatalogoChecklist.codigo_item")
    evaluaciones = relationship("EvaluacionSistema", back_populates="sistema")
