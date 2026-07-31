"""
Domain Service: MaquinaEstadoInspeccion
Pure business domain logic — state machine for inspection lifecycle.
Enforces RN-07.
"""
from enum import Enum

class EstadoInspeccion(str, Enum):
    EN_REVISION = "en_revision"
    CON_HALLAZGOS = "con_hallazgos"
    PENDIENTE_APROBACION = "pendiente_aprobacion"
    APROBADO = "aprobado"

class EventoInspeccion(str, Enum):
    CREAR_SIN_HALLAZGOS = "crear_sin_hallazgos"
    CREAR_CON_HALLAZGOS = "crear_con_hallazgos"
    CORREGIR_HALLAZGOS = "corregir_hallazgos"
    ATENDER_TODOS_HALLAZGOS = "atender_todos_hallazgos"
    APROBAR = "aprobar"
    REABRIR = "reabrir"

TRANSICIONES_VALIDAS = {
    EstadoInspeccion.EN_REVISION: {
        EventoInspeccion.CREAR_SIN_HALLAZGOS: EstadoInspeccion.PENDIENTE_APROBACION,
        EventoInspeccion.CREAR_CON_HALLAZGOS: EstadoInspeccion.CON_HALLAZGOS,
    },
    EstadoInspeccion.CON_HALLAZGOS: {
        EventoInspeccion.CORREGIR_HALLAZGOS: EstadoInspeccion.PENDIENTE_APROBACION,
        EventoInspeccion.ATENDER_TODOS_HALLAZGOS: EstadoInspeccion.PENDIENTE_APROBACION,
    },
    EstadoInspeccion.PENDIENTE_APROBACION: {
        EventoInspeccion.APROBAR: EstadoInspeccion.APROBADO,
        EventoInspeccion.CORREGIR_HALLAZGOS: EstadoInspeccion.PENDIENTE_APROBACION,
    },
    EstadoInspeccion.APROBADO: {
        EventoInspeccion.REABRIR: EstadoInspeccion.EN_REVISION  # Solo admin
    }
}

class MaquinaEstadoInspeccion:
    @staticmethod
    def transicionar(estado_actual: str, evento: str) -> str:
        """
        Realiza una transición de estado segura. Levanta ValueError si la transición es inválida.
        """
        try:
            st = EstadoInspeccion(estado_actual)
            ev = EventoInspeccion(evento)
        except ValueError as e:
            raise ValueError(f"Estado o evento inválido: {e}")

        transiciones = TRANSICIONES_VALIDAS.get(st, {})
        if ev not in transiciones:
            raise ValueError(
                f"Transición de estado no permitida: de '{estado_actual}' con evento '{evento}'."
            )

        return transiciones[ev].value

    @staticmethod
    def puede_aprobar(estado_actual: str, hallazgos_pendientes_count: int) -> bool:
        """
        Una inspección solo puede ser aprobada si está en 'pendiente_aprobacion'
        y no tiene hallazgos pendientes.
        """
        return estado_actual == EstadoInspeccion.PENDIENTE_APROBACION and hallazgos_pendientes_count == 0

    @staticmethod
    def puede_reabrir(usuario_rol: str, estado_actual: str) -> bool:
        """
        Solo el rol 'administrador' puede reabrir una inspección aprobada.
        """
        return usuario_rol == "administrador" and estado_actual == EstadoInspeccion.APROBADO
