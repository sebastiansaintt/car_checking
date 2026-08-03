import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate

class UsuarioService:
    @staticmethod
    def list_usuarios(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        solo_activos: bool = False
    ) -> List[Usuario]:
        query = db.query(Usuario)
        if solo_activos:
            query = query.filter(Usuario.activo == True)
        return query.order_by(Usuario.nombre.asc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_usuario_by_id(db: Session, usuario_id: uuid.UUID) -> Optional[Usuario]:
        return db.query(Usuario).filter(Usuario.id == usuario_id).first()

    @staticmethod
    def create_usuario(db: Session, data: UsuarioCreate) -> Usuario:
        # Verificar si el email ya existe
        existente = db.query(Usuario).filter(Usuario.email == data.email.lower()).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El correo electrónico '{data.email}' ya está registrado."
            )

        hashed_pwd = hash_password(data.password)
        nuevo_usuario = Usuario(
            id=uuid.uuid4(),
            nombre=data.nombre,
            email=data.email.lower(),
            password_hash=hashed_pwd,
            rol=data.rol,
            cargo=data.cargo,
            firma_url=data.firma_url,
            activo=True
        )

        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario

    @staticmethod
    def update_usuario(db: Session, usuario_id: uuid.UUID, data: UsuarioUpdate) -> Usuario:
        usuario = UsuarioService.get_usuario_by_id(db, usuario_id)
        if not usuario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El usuario seleccionado no existe."
            )

        if data.email and data.email.lower() != usuario.email:
            existente = db.query(Usuario).filter(Usuario.email == data.email.lower()).first()
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El correo electrónico '{data.email}' ya pertenece a otro usuario."
                )
            usuario.email = data.email.lower()

        if data.nombre is not None:
            usuario.nombre = data.nombre
        if data.password:
            usuario.password_hash = hash_password(data.password)
        if data.rol is not None:
            usuario.rol = data.rol
        if data.cargo is not None:
            usuario.cargo = data.cargo
        if data.firma_url is not None:
            usuario.firma_url = data.firma_url
        if data.activo is not None:
            usuario.activo = data.activo

        db.commit()
        db.refresh(usuario)
        return usuario
