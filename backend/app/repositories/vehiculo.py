import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.vehiculo import Vehiculo

class VehiculoRepository:
    @staticmethod
    def get_by_id(db: Session, vehiculo_id: uuid.UUID) -> Optional[Vehiculo]:
        """Obtiene un vehículo por su ID."""
        return db.query(Vehiculo).filter(Vehiculo.id == vehiculo_id).first()

    @staticmethod
    def get_by_patente(db: Session, patente: str) -> Optional[Vehiculo]:
        """Obtiene un vehículo por su patente/placa."""
        return db.query(Vehiculo).filter(Vehiculo.patente.ilike(patente.strip())).first()

    @staticmethod
    def get_or_create_by_placa(
        db: Session,
        placa: str,
        empresa_contratista_id: Optional[uuid.UUID] = None,
        marca: str = "Genérica",
        modelo: str = "Estándar",
        año: int = 2024,
        tipo_vehiculo: Optional[str] = "Camioneta",
        numero_interno: Optional[str] = None,
        color: Optional[str] = None,
        equipo_auxiliar: Optional[str] = None,
        area_transitar: Optional[str] = None,
        kilometraje: int = 0
    ) -> Vehiculo:
        """
        ADJ-01: Alta dinámica por placa.
        Si la placa existe en BD, vincula a esa entidad y actualiza datos faltantes.
        Si no existe, crea una nueva entidad de vehículo.
        """
        patente_norm = placa.strip().upper()
        vehiculo = db.query(Vehiculo).filter(Vehiculo.patente == patente_norm).first()

        if vehiculo:
            # Actualizar campos informativos si fueron proporcionados
            if empresa_contratista_id:
                vehiculo.empresa_contratista_id = empresa_contratista_id
            if marca and marca != "Genérica":
                vehiculo.marca = marca
            if modelo and modelo != "Estándar":
                vehiculo.modelo = modelo
            if año:
                vehiculo.año = año
            if tipo_vehiculo:
                vehiculo.tipo_vehiculo = tipo_vehiculo
            if numero_interno:
                vehiculo.numero_interno = numero_interno
            if color:
                vehiculo.color = color
            if equipo_auxiliar:
                vehiculo.equipo_auxiliar = equipo_auxiliar
            if area_transitar:
                vehiculo.area_transitar = area_transitar
            if kilometraje > vehiculo.kilometraje_actual:
                vehiculo.kilometraje_actual = kilometraje
            
            db.add(vehiculo)
            db.flush()
            return vehiculo

        # Crear nuevo vehículo
        vehiculo = Vehiculo(
            patente=patente_norm,
            empresa_contratista_id=empresa_contratista_id,
            marca=marca,
            modelo=modelo,
            año=año,
            tipo_vehiculo=tipo_vehiculo,
            numero_interno=numero_interno,
            color=color,
            equipo_auxiliar=equipo_auxiliar,
            area_transitar=area_transitar,
            kilometraje_actual=kilometraje,
            estado="activo"
        )
        db.add(vehiculo)
        db.flush()
        return vehiculo

    @staticmethod
    def get_all_active(db: Session) -> List[Vehiculo]:
        """Retorna todos los vehículos activos."""
        return db.query(Vehiculo).filter(Vehiculo.estado == "activo").order_by(Vehiculo.patente).all()

    @staticmethod
    def update_kilometraje(db: Session, vehiculo: Vehiculo, nuevo_kilometraje: int) -> Vehiculo:
        """Actualiza el kilometraje actual de un vehículo."""
        if nuevo_kilometraje > vehiculo.kilometraje_actual:
            vehiculo.kilometraje_actual = nuevo_kilometraje
            db.add(vehiculo)
            db.commit()
            db.refresh(vehiculo)
        return vehiculo
