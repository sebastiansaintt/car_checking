import uuid
from typing import Optional
from sqlalchemy.orm import Session
from app.models.vehiculo import Vehiculo

class VehiculoRepository:
    @staticmethod
    def get_by_id(db: Session, vehiculo_id: uuid.UUID) -> Optional[Vehiculo]:
        """Obtiene un vehículo por su ID."""
        return db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()

    @staticmethod
    def get_all_active(db: Session) -> list[Vehiculo]:
        """Retorna todos los vehículos activos."""
        return db.query(Vehiculo).filter(Vehiculo.estado == "activo").order_by(Vehiculo.patente).all()

    @staticmethod
    def update_kilometraje(db: Session, vehiculo: Vehiculo, nuevo_kilometraje: int) -> Vehiculo:
        """Actualiza el kilometraje actual de un vehículo."""
        vehiculo.kilometraje_actual = nuevo_kilometraje
        db.add(vehiculo)
        db.commit()
        db.refresh(vehiculo)
        return vehiculo
