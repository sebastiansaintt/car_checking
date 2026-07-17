import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.usuario import Usuario

class UsuarioRepository:
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[Usuario]:
        """Busca un usuario activo por su email."""
        return db.query(Usuario).filter(Usuario.email == email, Usuario.activo == True).first()

    @staticmethod
    def get_by_id(db: Session, user_id: uuid.UUID) -> Optional[Usuario]:
        """Busca un usuario por su ID."""
        return db.query(Usuario).filter(Usuario.id == user_id).first()
