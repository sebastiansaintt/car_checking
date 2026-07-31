import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.empresa_contratista import EmpresaContratistaRepository
from app.schemas.empresa_contratista import EmpresaContratistaCreate, EmpresaContratistaUpdate
from app.models.empresa_contratista import EmpresaContratista

class EmpresaContratistaService:
    @staticmethod
    def create_empresa(db: Session, data: EmpresaContratistaCreate) -> EmpresaContratista:
        existing = EmpresaContratistaRepository.get_by_nombre(db, data.nombre)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa contratista registrada con el nombre '{data.nombre}'."
            )
        return EmpresaContratistaRepository.create(db, data)

    @staticmethod
    def update_empresa(db: Session, empresa_id: uuid.UUID, data: EmpresaContratistaUpdate) -> EmpresaContratista:
        empresa = EmpresaContratistaRepository.get_by_id(db, empresa_id)
        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La empresa contratista no existe."
            )
        if data.nombre and data.nombre.lower() != empresa.nombre.lower():
            dup = EmpresaContratistaRepository.get_by_nombre(db, data.nombre)
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otra empresa registrada con el nombre '{data.nombre}'."
                )
        return EmpresaContratistaRepository.update(db, empresa, data)

    @staticmethod
    def list_empresas(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False) -> List[EmpresaContratista]:
        return EmpresaContratistaRepository.get_all(db, skip=skip, limit=limit, solo_activos=solo_activos)
