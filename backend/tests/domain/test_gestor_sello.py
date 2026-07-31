from datetime import datetime
from app.domain.inspeccion.gestor_sello import GestorSelloAprobacion

def test_generar_sello_aprobacion():
    creacion = datetime(2026, 7, 30, 10, 15, 0)
    aprobacion = datetime(2026, 7, 30, 14, 30, 0)

    sello = GestorSelloAprobacion.generar_sello(
        numero_inspeccion=4792,
        fecha_creacion=creacion,
        fecha_aprobacion=aprobacion,
        nombre_jefe="Eduardo García",
        firma_jefe_url="/static/uploads/firma_jefe.png"
    )

    assert sello.empresa_nombre == "Sointer Ltda."
    assert sello.numero_inspeccion == 4792
    assert sello.leyenda == "APROBADO"
    assert sello.aprobado_por_nombre == "Eduardo García"
    assert sello.fecha_creacion_str == "2026-07-30 10:15:00"
    assert sello.fecha_aprobacion_str == "2026-07-30 14:30:00"

    d = sello.to_dict()
    assert d["leyenda"] == "APROBADO"
    assert d["numero_inspeccion"] == 4792
