import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.inspeccion import Inspeccion, ChecklistItem, EvidenciaFotografica, CatalogoChecklist

class InspeccionRepository:
    @staticmethod
    def get_by_id(db: Session, inspeccion_id: uuid.UUID) -> Optional[Inspeccion]:
        """Obtiene una inspección que no esté marcada como eliminada."""
        return db.query(Inspeccion).filter(
            Inspeccion.id == inspeccion_id, 
            Inspeccion.deleted_at.is_(None)
        ).first()

    @staticmethod
    def get_all_active(db: Session, skip: int = 0, limit: int = 100) -> list[Inspeccion]:
        """Retorna todas las inspecciones activas (no eliminadas)."""
        return db.query(Inspeccion).filter(
            Inspeccion.deleted_at.is_(None)
        ).order_by(Inspeccion.fecha.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_checklist_catalog(db: Session) -> list[CatalogoChecklist]:
        """Retorna el catálogo maestro de items de checklist activos."""
        return db.query(CatalogoChecklist).filter(CatalogoChecklist.activo == True).order_by(CatalogoChecklist.nombre).all()

    @staticmethod
    def get_catalog_item_by_id(db: Session, catalogo_id: uuid.UUID) -> Optional[CatalogoChecklist]:
        """Busca un item de catálogo por ID."""
        return db.query(CatalogoChecklist).filter(CatalogoChecklist.id == catalogo_id).first()

    @staticmethod
    def create_inspeccion(
        db: Session,
        inspeccion: Inspeccion,
        items: list[ChecklistItem],
        evidencias: list[EvidenciaFotografica]
    ) -> Inspeccion:
        """
        Guarda una inspección junto con todos sus checklist items y
        evidencias fotográficas en una sola transacción atómica.
        """
        try:
            inspeccion.checklist_items = items
            inspeccion.evidencias = evidencias
            db.add(inspeccion)
            db.commit()
            db.refresh(inspeccion)
            return inspeccion
        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def save(db: Session, model_instance) -> None:
        """Guarda o actualiza cualquier instancia y confirma la transacción."""
        db.add(model_instance)
        db.commit()
        db.refresh(model_instance)

    @staticmethod
    def soft_delete(db: Session, inspeccion: Inspeccion) -> Inspeccion:
        """Marca una inspección como eliminada (Soft Delete)."""
        inspeccion.deleted_at = datetime.now(timezone.utc)
        db.add(inspeccion)
        db.commit()
        db.refresh(inspeccion)
        return inspeccion
