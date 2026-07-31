import pytest
from app.domain.inspeccion.maquina_estado import (
    MaquinaEstadoInspeccion,
    EstadoInspeccion,
    EventoInspeccion
)

def test_transicion_crear_sin_hallazgos():
    nuevo = MaquinaEstadoInspeccion.transicionar("en_revision", "crear_sin_hallazgos")
    assert nuevo == EstadoInspeccion.PENDIENTE_APROBACION.value

def test_transicion_crear_con_hallazgos():
    nuevo = MaquinaEstadoInspeccion.transicionar("en_revision", "crear_con_hallazgos")
    assert nuevo == EstadoInspeccion.CON_HALLAZGOS.value

def test_transicion_atender_hallazgos():
    nuevo = MaquinaEstadoInspeccion.transicionar("con_hallazgos", "atender_todos_hallazgos")
    assert nuevo == EstadoInspeccion.PENDIENTE_APROBACION.value

def test_transicion_aprobar():
    nuevo = MaquinaEstadoInspeccion.transicionar("pendiente_aprobacion", "aprobar")
    assert nuevo == EstadoInspeccion.APROBADO.value

def test_transicion_invalida_lanza_excepcion():
    with pytest.raises(ValueError):
        MaquinaEstadoInspeccion.transicionar("aprobado", "crear_con_hallazgos")

def test_puede_aprobar_reglas():
    assert MaquinaEstadoInspeccion.puede_aprobar("pendiente_aprobacion", 0) is True
    assert MaquinaEstadoInspeccion.puede_aprobar("pendiente_aprobacion", 2) is False
    assert MaquinaEstadoInspeccion.puede_aprobar("con_hallazgos", 0) is False

def test_puede_reabrir_solo_admin():
    assert MaquinaEstadoInspeccion.puede_reabrir("administrador", "aprobado") is True
    assert MaquinaEstadoInspeccion.puede_reabrir("jefe_inspeccion", "aprobado") is False
    assert MaquinaEstadoInspeccion.puede_reabrir("tecnico_inspector", "aprobado") is False
