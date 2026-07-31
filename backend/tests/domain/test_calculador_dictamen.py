from app.domain.inspeccion.calculador_dictamen import (
    CalculadorDictamen,
    ItemEvaluacion,
    EvaluacionSistemaResultado,
    RESULTADO_SISTEMA_APROBADO,
    RESULTADO_SISTEMA_NO_APROBADO,
    DICTAMEN_APROBADO,
    DICTAMEN_CON_HALLAZGOS
)

def test_sistema_aprobado_cuando_todos_estandar_o_na():
    items = [
        ItemEvaluacion(catalogo_id="1", valor="estandar"),
        ItemEvaluacion(catalogo_id="2", valor="na"),
        ItemEvaluacion(catalogo_id="3", valor="estandar")
    ]
    res = CalculadorDictamen.calcular_estado_sistema(items)
    assert res == RESULTADO_SISTEMA_APROBADO

def test_sistema_no_aprobado_cuando_un_item_subestandar():
    items = [
        ItemEvaluacion(catalogo_id="1", valor="estandar"),
        ItemEvaluacion(catalogo_id="2", valor="subestandar", comentario="Manguera rota"),
        ItemEvaluacion(catalogo_id="3", valor="na")
    ]
    res = CalculadorDictamen.calcular_estado_sistema(items)
    assert res == RESULTADO_SISTEMA_NO_APROBADO

def test_dictamen_general_aprobado_si_todos_sistemas_aprobados():
    sistemas = [
        EvaluacionSistemaResultado("sys1", "Dirección", RESULTADO_SISTEMA_APROBADO, []),
        EvaluacionSistemaResultado("sys2", "Frenos", RESULTADO_SISTEMA_APROBADO, [])
    ]
    dictamen = CalculadorDictamen.calcular_dictamen_general(sistemas)
    assert dictamen == DICTAMEN_APROBADO
    assert not CalculadorDictamen.requiere_segunda_revision(dictamen)

def test_dictamen_general_con_hallazgos_si_al_menos_un_sistema_no_aprobado():
    sistemas = [
        EvaluacionSistemaResultado("sys1", "Dirección", RESULTADO_SISTEMA_APROBADO, []),
        EvaluacionSistemaResultado("sys2", "Frenos", RESULTADO_SISTEMA_NO_APROBADO, [])
    ]
    dictamen = CalculadorDictamen.calcular_dictamen_general(sistemas)
    assert dictamen == DICTAMEN_CON_HALLAZGOS
    assert CalculadorDictamen.requiere_segunda_revision(dictamen)
