import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from app.models.inspeccion import Inspeccion, ChecklistItem, EvidenciaFotografica, CatalogoChecklist
from app.models.catalogo_sistema import CatalogoSistema
from app.models.evaluacion_sistema import EvaluacionSistema
from app.models.firma_tecnico import FirmaTecnico


class InspeccionRepository:
    @staticmethod
    def get_by_id(db: Session, inspeccion_id: uuid.UUID) -> Optional[Inspeccion]:
        """Obtiene una inspección que no esté marcada como eliminada."""
        return db.query(Inspeccion).options(
            joinedload(Inspeccion.vehiculo),
            joinedload(Inspeccion.empresa_contratista),
            joinedload(Inspeccion.creado_por),
            joinedload(Inspeccion.aprobado_por),
            joinedload(Inspeccion.evaluaciones_sistema).joinedload(EvaluacionSistema.sistema),
            joinedload(Inspeccion.checklist_items).joinedload(ChecklistItem.catalogo),
            joinedload(Inspeccion.hallazgos),
            joinedload(Inspeccion.firmas_tecnicos).joinedload(FirmaTecnico.usuario),
            joinedload(Inspeccion.evidencias)
        ).filter(
            Inspeccion.id == inspeccion_id,
            Inspeccion.deleted_at.is_(None)
        ).first()

    @staticmethod
    def get_all_active(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        vehiculo_id: Optional[uuid.UUID] = None,
        empresa_contratista_id: Optional[uuid.UUID] = None,
        coordinador_id: Optional[uuid.UUID] = None,
        estado: Optional[str] = None,
        resultado_general: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> List[Inspeccion]:
        """Retorna todas las inspecciones activas (no eliminadas) aplicando filtros opcionales."""
        query = db.query(Inspeccion).options(
            joinedload(Inspeccion.vehiculo),
            joinedload(Inspeccion.empresa_contratista),
            joinedload(Inspeccion.creado_por),
            joinedload(Inspeccion.evaluaciones_sistema),
            joinedload(Inspeccion.hallazgos),
            joinedload(Inspeccion.firmas_tecnicos)
        ).filter(Inspeccion.deleted_at.is_(None))

        if vehiculo_id:
            query = query.filter(Inspeccion.vehiculo_id == vehiculo_id)
        if empresa_contratista_id:
            query = query.filter(Inspeccion.empresa_contratista_id == empresa_contratista_id)
        if coordinador_id:
            query = query.filter(Inspeccion.creado_por_id == coordinador_id)
        if estado:
            query = query.filter(Inspeccion.estado == estado)
        if resultado_general:
            query = query.filter(Inspeccion.resultado_general == resultado_general)
        if fecha_inicio:
            query = query.filter(Inspeccion.fecha >= fecha_inicio)
        if fecha_fin:
            query = query.filter(Inspeccion.fecha <= fecha_fin)

        return query.order_by(Inspeccion.fecha.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_sistemas_catalog(db: Session) -> List[CatalogoSistema]:
        """Retorna los 9 sistemas maestros ordenados."""
        return db.query(CatalogoSistema).filter(CatalogoSistema.activo == True).order_by(CatalogoSistema.orden.asc()).all()

    @staticmethod
    def get_checklist_catalog(db: Session) -> List[CatalogoChecklist]:
        """Retorna el catálogo maestro de ítems de checklist activos."""
        return db.query(CatalogoChecklist).filter(CatalogoChecklist.activo == True).order_by(CatalogoChecklist.codigo_item.asc(), CatalogoChecklist.nombre.asc()).all()

    @staticmethod
    def get_catalog_item_by_id(db: Session, catalogo_id: uuid.UUID) -> Optional[CatalogoChecklist]:
        """Busca un ítem de catálogo por ID."""
        return db.query(CatalogoChecklist).filter(CatalogoChecklist.id == catalogo_id).first()

    @staticmethod
    def create_inspeccion(
        db: Session,
        inspeccion: Inspeccion,
        evaluaciones: List[EvaluacionSistema],
        items: List[ChecklistItem],
        evidencias: List[EvidenciaFotografica]
    ) -> Inspeccion:
        """
        Guarda una inspección junto con sus evaluaciones por sistema, checklist items y evidencias.
        """
        try:
            inspeccion.evaluaciones_sistema = evaluaciones
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
