import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.usuario import Usuario
from app.models.catalogo_sistema import CatalogoSistema
from app.models.inspeccion import CatalogoChecklist
from app.schemas.inspeccion import (
    InspeccionCreate,
    ChecklistItemCreate,
    InspeccionAprobarRequest,
    SegundaRevisionRequest,
    HallazgoUpdate
)
from app.services.inspeccion import InspeccionService
from app.domain.inspeccion.maquina_estado import EstadoInspeccion

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed mínimo para test
    tecnico = Usuario(nombre="Eduardo Técnico", email="tecnico@sointer.com", password_hash="hash", rol="tecnico_inspector")
    jefe = Usuario(nombre="Jhon Jefe", email="jefe@sointer.com", password_hash="hash", rol="jefe_inspeccion")
    sys1 = CatalogoSistema(codigo="1", nombre="SISTEMA DE DIRECCIÓN", orden=1)
    session.add_all([tecnico, jefe, sys1])
    session.flush()

    cat1 = CatalogoChecklist(sistema_id=sys1.id, codigo_item="1.1", nombre="NIVEL DE FLUIDO")
    cat2 = CatalogoChecklist(sistema_id=sys1.id, codigo_item="1.2", nombre="MANGUERAS Y LÍNEAS")
    session.add_all([cat1, cat2])
    session.commit()

    yield {
        "db": session,
        "tecnico": tecnico,
        "jefe": jefe,
        "cat1": cat1,
        "cat2": cat2
    }
    session.close()

def test_crear_inspeccion_sin_hallazgos_y_aprobar(db_session):
    db = db_session["db"]
    tecnico = db_session["tecnico"]
    jefe = db_session["jefe"]
    cat1 = db_session["cat1"]
    cat2 = db_session["cat2"]

    data = InspeccionCreate(
        placa="NYP058",
        marca="Foton",
        modelo="2025",
        año=2025,
        kilometraje=55439,
        firma_url="data:image/png;base64,tecnicofirma",
        nombres_tecnicos_adicionales=["Jhon R."],
        checklist_items=[
            ChecklistItemCreate(catalogo_id=cat1.id, valor="estandar"),
            ChecklistItemCreate(catalogo_id=cat2.id, valor="estandar")
        ]
    )

    inspeccion = InspeccionService.create_inspeccion(db, tecnico, data)

    assert inspeccion.id is not None
    assert inspeccion.vehiculo.patente == "NYP058"
    assert inspeccion.resultado_general == "aprobado"
    assert inspeccion.estado == EstadoInspeccion.PENDIENTE_APROBACION.value
    assert len(inspeccion.firmas_tecnicos) == 2  # Logueado + adicional

    # Aprobar por el Jefe
    aprob_req = InspeccionAprobarRequest(firma_url="data:image/png;base64,jefefirma")
    aprobada = InspeccionService.aprobar_inspeccion(db, jefe, inspeccion.id, aprob_req)

    assert aprobada.estado == EstadoInspeccion.APROBADO.value
    assert aprobada.sello_url is not None
    assert "Sointer Ltda." in aprobada.sello_url
    assert aprobada.fecha_proxima_revision is not None

def test_crear_inspeccion_con_hallazgos_y_atender(db_session):
    db = db_session["db"]
    tecnico = db_session["tecnico"]
    cat1 = db_session["cat1"]
    cat2 = db_session["cat2"]

    data = InspeccionCreate(
        placa="NYP058",
        marca="Foton",
        modelo="2025",
        año=2025,
        kilometraje=55439,
        firma_url="data:image/png;base64,tecnicofirma",
        checklist_items=[
            ChecklistItemCreate(catalogo_id=cat1.id, valor="estandar"),
            ChecklistItemCreate(catalogo_id=cat2.id, valor="subestandar", comentario="Fuga detectada")
        ]
    )

    inspeccion = InspeccionService.create_inspeccion(db, tecnico, data)

    assert inspeccion.resultado_general == "con_hallazgos"
    assert inspeccion.estado == EstadoInspeccion.CON_HALLAZGOS.value
    assert len(inspeccion.hallazgos) == 1

    # Atender hallazgo
    hallazgo_id = inspeccion.hallazgos[0].id
    InspeccionService.marcar_hallazgo_atendido(db, tecnico, hallazgo_id)

    inspeccion_actualizada = db.query(type(inspeccion)).filter_by(id=inspeccion.id).first()
    assert inspeccion_actualizada.estado == EstadoInspeccion.PENDIENTE_APROBACION.value

def test_solicitar_segunda_revision(db_session):
    db = db_session["db"]
    tecnico = db_session["tecnico"]
    jefe = db_session["jefe"]
    cat1 = db_session["cat1"]

    data = InspeccionCreate(
        placa="NYP058",
        marca="Foton",
        modelo="2025",
        año=2025,
        kilometraje=55439,
        firma_url="data:image/png;base64,tecnicofirma",
        checklist_items=[
            ChecklistItemCreate(catalogo_id=cat1.id, valor="subestandar", comentario="Daño grave")
        ]
    )

    original = InspeccionService.create_inspeccion(db, tecnico, data)

    # Jefe solicita 2da revisión
    nueva_revision = InspeccionService.solicitar_segunda_revision(
        db, jefe, original.id, observaciones="Revisar neumático cambiado"
    )

    assert original.estado == EstadoInspeccion.SEGUNDA_REVISION_SOLICITADA.value
    assert nueva_revision.numero_revision == 2
    assert nueva_revision.inspeccion_previa_id == original.id
    assert nueva_revision.estado == EstadoInspeccion.EN_REVISION.value
