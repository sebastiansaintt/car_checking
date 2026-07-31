import uuid
from datetime import date
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.hallazgo import Hallazgo

class HallazgoRepository:
    @staticmethod
    def get_by_id(db: Session, hallazgo_id: uuid.UUID) -> Optional[Hallazgo]:
        return db.query(Hallazgo).filter(Hallazgo.id == hallazgo_id).first()

    @staticmethod
    def get_by_inspeccion(db: Session, inspeccion_id: uuid.UUID) -> List[Hallazgo]:
        return db.query(Hallazgo).filter(Hallazgo.inspeccion_id == inspeccion_id).all()

    @staticmethod
    def get_pendientes_by_inspeccion(db: Session, inspeccion_id: uuid.UUID) -> List[Hallazgo]:
        return db.query(Hallazgo).filter(
            Hallazgo.inspeccion_id == inspeccion_id,
            Hallazgo.atendido == False
        ).all()

    @staticmethod
    def create(db: Session, hallazgo: Hallazgo) -> Hallazgo:
        db.add(hallazgo)
        db.flush()
        return hallazgo

    @staticmethod
    def marcar_atendido(db: Session, hallazgo: Hallazgo, fecha_atencion: Optional[date] = None) -> Hallazgo:
        hallazgo.atendido = True
        hallazgo.fecha_atencion = fecha_atencion or date.today()
        db.add(hallazgo)
        db.flush()
        return hallazgo
