import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.services.usuario import UsuarioService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_crud_usuario(db_session):
    # 1. Crear usuario
    u_create = UsuarioCreate(
        nombre="Inspector Carlos Ruiz",
        email="carlos.ruiz@sointer.com",
        password="password123",
        rol="tecnico_inspector",
        cargo="Técnico de Terreno"
    )
    user = UsuarioService.create_usuario(db_session, u_create)
    assert user.id is not None
    assert user.nombre == "Inspector Carlos Ruiz"
    assert user.email == "carlos.ruiz@sointer.com"
    assert user.rol == "tecnico_inspector"
    assert user.activo is True

    # 2. Listar usuarios
    users = UsuarioService.list_usuarios(db_session)
    assert len(users) == 1

    # 3. Editar usuario
    u_update = UsuarioUpdate(
        nombre="Carlos A. Ruiz",
        cargo="Técnico Sénior",
        rol="jefe_inspeccion"
    )
    updated_user = UsuarioService.update_usuario(db_session, user.id, u_update)
    assert updated_user.nombre == "Carlos A. Ruiz"
    assert updated_user.cargo == "Técnico Sénior"
    assert updated_user.rol == "jefe_inspeccion"

def test_crear_usuario_email_duplicado(db_session):
    u_create = UsuarioCreate(
        nombre="User One",
        email="duplicado@sointer.com",
        password="password123",
        rol="tecnico_inspector"
    )
    UsuarioService.create_usuario(db_session, u_create)

    with pytest.raises(Exception):
        UsuarioService.create_usuario(db_session, u_create)
