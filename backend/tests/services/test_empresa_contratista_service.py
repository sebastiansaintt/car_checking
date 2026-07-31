import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.core.database import Base
from app.schemas.empresa_contratista import EmpresaContratistaCreate, EmpresaContratistaUpdate
from app.services.empresa_contratista import EmpresaContratistaService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_crear_empresa_contratista(db_session):
    data = EmpresaContratistaCreate(nombre="Epromecánica S.A.S.", rut="900123456-1", contacto="contacto@epromecanica.com")
    empresa = EmpresaContratistaService.create_empresa(db_session, data)
    assert empresa.id is not None
    assert empresa.nombre == "Epromecánica S.A.S."

def test_error_empresa_duplicada(db_session):
    data = EmpresaContratistaCreate(nombre="Epromecánica S.A.S.", rut="900123456-1")
    EmpresaContratistaService.create_empresa(db_session, data)

    with pytest.raises(HTTPException) as exc_info:
        EmpresaContratistaService.create_empresa(db_session, data)
    assert exc_info.value.status_code == 400
