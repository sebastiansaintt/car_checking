import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.vehiculo import Vehiculo
from app.models.empresa_contratista import EmpresaContratista
from app.repositories.vehiculo import VehiculoRepository

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_get_or_create_by_placa_nueva(db_session):
    v = VehiculoRepository.get_or_create_by_placa(
        db=db_session,
        placa="nyp058",
        marca="Foton",
        modelo="2025",
        kilometraje=55000
    )
    assert v.id is not None
    assert v.patente == "NYP058"
    assert v.marca == "Foton"
    assert v.kilometraje_actual == 55000

def test_get_or_create_by_placa_existente(db_session):
    # Primera llamada crea
    v1 = VehiculoRepository.get_or_create_by_placa(
        db=db_session,
        placa="NYP058",
        marca="Foton",
        modelo="2025",
        kilometraje=10000
    )
    db_session.commit()

    # Segunda llamada recupera y actualiza km si es mayor
    v2 = VehiculoRepository.get_or_create_by_placa(
        db=db_session,
        placa="nyp058",
        kilometraje=15000
    )

    assert v1.id == v2.id
    assert v2.kilometraje_actual == 15000
