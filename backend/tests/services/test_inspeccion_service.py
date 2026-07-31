import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.usuario import Usuario
from app.models.catalogo_sistema import CatalogoSistema
from app.models.inspeccion import CatalogoChecklist
from app.models.audit_log import AuditLog
from app.schemas.inspeccion import (
    InspeccionCreate,
    InspeccionUpdate,
    ChecklistItemCreate,
    InspeccionAprobarRequest
)
from app.services.inspeccion import InspeccionService
from app.domain.inspeccion.maquina_estado import EstadoInspeccion

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

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
    assert len(inspeccion.firmas_tecnicos) == 2

    # Aprobar por el Jefe
    aprob_req = InspeccionAprobarRequest(firma_url="data:image/png;base64,jefefirma")
    aprobada = InspeccionService.aprobar_inspeccion(db, jefe, inspeccion.id, aprob_req)

    assert aprobada.estado == EstadoInspeccion.APROBADO.value
    assert aprobada.sello_url is not None
    assert "Sointer Ltda." in aprobada.sello_url
    assert aprobada.fecha_proxima_revision is not None

def test_corregir_inspeccion_misma_planilla_y_auditar(db_session):
    """
    Test de la regla del usuario:
    Se crea inspección con hallazgos (con_hallazgos). El conductor corrige físicamente.
    El técnico edita la misma inspección (corregir_inspeccion), los ítems pasan a 'estandar',
    la revisión sube a 2, el estado pasa a 'pendiente_aprobacion', se audita con el decorador
    y finalmente el Jefe aprueba la planilla original.
    """
    db = db_session["db"]
    tecnico = db_session["tecnico"]
    jefe = db_session["jefe"]
    cat1 = db_session["cat1"]
    cat2 = db_session["cat2"]

    # 1. Registro inicial con hallazgos
    data_inicial = InspeccionCreate(
        placa="NYP058",
        marca="Foton",
        modelo="2025",
        año=2025,
        kilometraje=55439,
        firma_url="data:image/png;base64,tecnicofirma",
        checklist_items=[
            ChecklistItemCreate(catalogo_id=cat1.id, valor="estandar"),
            ChecklistItemCreate(catalogo_id=cat2.id, valor="subestandar", comentario="Manguera suelta")
        ]
    )

    inspeccion = InspeccionService.create_inspeccion(db, tecnico, data_inicial)
    assert inspeccion.resultado_general == "con_hallazgos"
    assert inspeccion.estado == EstadoInspeccion.CON_HALLAZGOS.value
    assert inspeccion.numero_revision == 1
    ins_id = inspeccion.id

    # 2. Técnico re-inspecciona físicamente y edita LA MISMA PLANILLA
    data_correccion = InspeccionUpdate(
        checklist_items=[
            ChecklistItemCreate(catalogo_id=cat2.id, valor="estandar", comentario="Manguera apretada y corregida")
        ],
        observaciones="Hallazgo corregido físicamente en 2do chequeo"
    )

    corregida = InspeccionService.corregir_inspeccion(db, tecnico, ins_id, data_correccion)

    # 3. Verificaciones de la re-inspección en la misma planilla
    assert corregida.id == ins_id  # MISMO ID de inspección
    assert corregida.numero_revision == 2  # Incrementó número de revisión
    assert corregida.resultado_general == "aprobado"  # Todos los sistemas en E o NA
    assert corregida.estado == EstadoInspeccion.PENDIENTE_APROBACION.value

    # Verificar audit log generado por el decorador
    audit_log = db.query(AuditLog).filter(
        AuditLog.entidad_id == str(ins_id),
        AuditLog.accion == "corregir_reporte_inspeccion"
    ).first()
    assert audit_log is not None
    assert audit_log.detalle["numero_revision"] == 2

    # 4. Jefe aprueba la planilla corregida
    aprob_req = InspeccionAprobarRequest(firma_url="data:image/png;base64,jefefirma")
    aprobada = InspeccionService.aprobar_inspeccion(db, jefe, ins_id, aprob_req)

    assert aprobada.estado == EstadoInspeccion.APROBADO.value
    assert "Sointer Ltda." in aprobada.sello_url
