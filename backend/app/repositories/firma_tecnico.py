import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.firma_tecnico import FirmaTecnico

class FirmaTecnicoRepository:
    @staticmethod
    def get_by_inspeccion(db: Session, inspeccion_id: uuid.UUID) -> List[FirmaTecnico]:
        return db.query(FirmaTecnico).filter(FirmaTecnico.inspeccion_id == inspeccion_id).all()

    @staticmethod
    def get_tecnicos_count(db: Session, inspeccion_id: uuid.UUID) -> int:
        return db.query(FirmaTecnico).filter(
            FirmaTecnico.inspeccion_id == inspeccion_id,
            FirmaTecnico.es_aprobador == False
        ).count()

    @staticmethod
    def registrar_firma_tecnico_logueado(
        db: Session,
        inspeccion_id: uuid.UUID,
        usuario_id: uuid.UUID,
        firma_url: str
    ) -> FirmaTecnico:
        firma = FirmaTecnico(
            inspeccion_id=inspeccion_id,
            usuario_id=usuario_id,
            firma_url=firma_url,
            es_aprobador=False
        )
        db.add(firma)
        db.flush()
        return firma

    @staticmethod
    def registrar_tecnico_adicional(
        db: Session,
        inspeccion_id: uuid.UUID,
        nombre_adicional: str
    ) -> FirmaTecnico:
        # RN-10: Verificar que no exceda 3 firmantes técnicos
        count = FirmaTecnicoRepository.get_tecnicos_count(db, inspeccion_id)
        if count >= 3:
            raise ValueError("No se pueden agregar más de 3 técnicos de inspección por reporte.")

        firma = FirmaTecnico(
            inspeccion_id=inspeccion_id,
            nombre_adicional=nombre_adicional.strip(),
            es_aprobador=False
        )
        db.add(firma)
        db.flush()
        return firma

    @staticmethod
    def registrar_firma_aprobador(
        db: Session,
        inspeccion_id: uuid.UUID,
        jefe_id: uuid.UUID,
        firma_url: str
    ) -> FirmaTecnico:
        firma = FirmaTecnico(
            inspeccion_id=inspeccion_id,
            usuario_id=jefe_id,
            firma_url=firma_url,
            es_aprobador=True
        )
        db.add(firma)
        db.flush()
        return firma
