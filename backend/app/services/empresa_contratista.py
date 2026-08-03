import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.empresa_contratista import EmpresaContratistaRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.empresa_contratista import EmpresaContratistaCreate, EmpresaContratistaUpdate
from app.models.empresa_contratista import EmpresaContratista
from app.models.usuario import Usuario

class EmpresaContratistaService:
    @staticmethod
    def create_empresa(
        db: Session,
        data: EmpresaContratistaCreate,
        usuario: Optional[Usuario] = None,
        ip: str = "system"
    ) -> EmpresaContratista:
        existing = EmpresaContratistaRepository.get_by_nombre(db, data.nombre)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe una empresa contratista registrada con el nombre '{data.nombre}'."
            )
        emp = EmpresaContratistaRepository.create(db, data)

        if usuario:
            AuditLogRepository.create_log(
                db=db,
                usuario_id=usuario.id,
                accion="crear",
                entidad="empresa_contratista",
                entidad_id=str(emp.id),
                ip=ip,
                detalle={"nombre": emp.nombre, "rut": emp.rut}
            )

        return emp

    @staticmethod
    def update_empresa(
        db: Session,
        empresa_id: uuid.UUID,
        data: EmpresaContratistaUpdate,
        usuario: Optional[Usuario] = None,
        ip: str = "system"
    ) -> EmpresaContratista:
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
        updated = EmpresaContratistaRepository.update(db, empresa, data)

        if usuario:
            AuditLogRepository.create_log(
                db=db,
                usuario_id=usuario.id,
                accion="editar",
                entidad="empresa_contratista",
                entidad_id=str(updated.id),
                ip=ip,
                detalle={"nombre": updated.nombre, "rut": updated.rut, "activo": updated.activo}
            )

        return updated

    @staticmethod
    def list_empresas(db: Session, skip: int = 0, limit: int = 100, solo_activos: bool = False) -> List[EmpresaContratista]:
        return EmpresaContratistaRepository.get_all(db, skip=skip, limit=limit, solo_activos=solo_activos)
