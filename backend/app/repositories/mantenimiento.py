import uuid
from datetime import date
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.mantenimiento import Mantenimiento

class MantenimientoRepository:
    @staticmethod
    def get_by_id(db: Session, mantenimiento_id: uuid.UUID) -> Optional[Mantenimiento]:
        return db.query(Mantenimiento)\
            .options(
                joinedload(Mantenimiento.vehiculo),
                joinedload(Mantenimiento.coordinador)
            )\
            .filter(Mantenimiento.id == mantenimiento_id).first()

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        vehiculo_id: Optional[uuid.UUID] = None,
        tipo: Optional[str] = None,
        estado: Optional[str] = None
    ) -> list[Mantenimiento]:
        query = db.query(Mantenimiento)\
            .options(
                joinedload(Mantenimiento.vehiculo),
                joinedload(Mantenimiento.coordinador)
            )

        if vehiculo_id:
            query = query.filter(Mantenimiento.vehiculo_id == vehiculo_id)
        if tipo:
            query = query.filter(Mantenimiento.tipo == tipo)
        if estado:
            query = query.filter(Mantenimiento.estado == estado)

        return query.order_by(Mantenimiento.fecha_limite.asc(), Mantenimiento.created_at.desc())\
            .offset(skip).limit(limit).all()

    @staticmethod
    def get_by_vehiculo(db: Session, vehiculo_id: uuid.UUID) -> list[Mantenimiento]:
        return db.query(Mantenimiento)\
            .options(
                joinedload(Mantenimiento.vehiculo),
                joinedload(Mantenimiento.coordinador)
            )\
            .filter(Mantenimiento.vehiculo_id == vehiculo_id)\
            .order_by(Mantenimiento.created_at.desc()).all()

    @staticmethod
    def get_pendientes_o_vencidos(db: Session) -> list[Mantenimiento]:
        """Obtiene mantenimientos pendientes o en progreso."""
        return db.query(Mantenimiento)\
            .options(joinedload(Mantenimiento.vehiculo))\
            .filter(Mantenimiento.estado.in_(["pendiente", "en_progreso"])).all()

    @staticmethod
    def create(db: Session, mantenimiento: Mantenimiento) -> Mantenimiento:
        db.add(mantenimiento)
        db.commit()
        db.refresh(mantenimiento)
        return mantenimiento

    @staticmethod
    def save(db: Session, mantenimiento: Mantenimiento) -> Mantenimiento:
        db.add(mantenimiento)
        db.commit()
        db.refresh(mantenimiento)
        return mantenimiento
