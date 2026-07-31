import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.empresa_contratista import EmpresaContratista
from app.schemas.empresa_contratista import EmpresaContratistaCreate, EmpresaContratistaUpdate

class EmpresaContratistaRepository:
    @staticmethod
    def get_by_id(db: Session, empresa_id: uuid.UUID) -> Optional[EmpresaContratista]:
        return db.query(EmpresaContratista).filter(EmpresaContratista.id == empresa_id).first()

    @staticmethod
    def get_by_nombre(db: Session, nombre: str) -> Optional[EmpresaContratista]:
        return db.query(EmpresaContratista).filter(EmpresaContratista.nombre.ilike(nombre)).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False) -> List[EmpresaContratista]:
        query = db.query(EmpresaContratista)
        if solo_activos:
            query = query.filter(EmpresaContratista.activo == True)
        return query.order_by(EmpresaContratista.nombre.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, data: EmpresaContratistaCreate) -> EmpresaContratista:
        empresa = EmpresaContratista(
            nombre=data.nombre,
            rut=data.rut,
            contacto=data.contacto,
            activo=True
        )
        db.add(empresa)
        db.commit()
        db.refresh(empresa)
        return empresa

    @staticmethod
    def update(db: Session, empresa: EmpresaContratista, data: EmpresaContratistaUpdate) -> EmpresaContratista:
        if data.nombre is not None:
            empresa.nombre = data.nombre
        if data.rut is not None:
            empresa.rut = data.rut
        if data.contacto is not None:
            empresa.contacto = data.contacto
        if data.activo is not None:
            empresa.activo = data.activo
        db.add(empresa)
        db.commit()
        db.refresh(empresa)
        return empresa
