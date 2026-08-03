import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.usuario import Usuario
from app.services.notificacion import NotificacionService

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

def test_notificacion_lifecycle(db_session):
    # 1. Crear usuario destinatario
    user = Usuario(
        id=uuid.uuid4(),
        nombre="Jefe Manuel Ramos",
        email="manuel@sointer.com",
        password_hash="hash",
        rol="jefe_inspeccion",
        activo=True
    )
    db_session.add(user)
    db_session.commit()

    # 2. Notificar por rol
    NotificacionService.notificar_por_rol(
        db=db_session,
        rol="jefe_inspeccion",
        tipo="inspeccion_creada",
        titulo="Nueva Inspección Pendiente",
        mensaje="Vehículo ABC-123 pendiente de revisión.",
        referencia_id=str(uuid.uuid4()),
        referencia_tipo="inspeccion"
    )

    # 3. Verificar notificaciones
    notifs = NotificacionService.get_notificaciones_usuario(db_session, user.id)
    assert len(notifs) == 1
    assert notifs[0].titulo == "Nueva Inspección Pendiente"
    assert notifs[0].leida is False

    # 4. Count unread
    count = NotificacionService.get_unread_count(db_session, user.id)
    assert count == 1

    # 5. Marcar como leída
    NotificacionService.marcar_leida(db_session, notifs[0].id, user.id)
    assert NotificacionService.get_unread_count(db_session, user.id) == 0
