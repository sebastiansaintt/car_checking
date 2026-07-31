"""
Domain Service: CalculadorDictamen
Pure business domain logic — zero FastAPI or SQLAlchemy dependencies.
Enforces RN-03, RN-04, RN-05.
"""
from dataclasses import dataclass
from typing import List, Dict

ESTADO_ESTANDAR = "estandar"      # E
ESTADO_SUBESTANDAR = "subestandar"  # S
ESTADO_NA = "na"                  # N/A

RESULTADO_SISTEMA_APROBADO = "aprobado"
RESULTADO_SISTEMA_NO_APROBADO = "no_aprobado"

DICTAMEN_APROBADO = "aprobado"
DICTAMEN_CON_HALLAZGOS = "con_hallazgos"

@dataclass(frozen=True)
class ItemEvaluacion:
    catalogo_id: str
    valor: str  # 'estandar', 'subestandar', 'na' (or legacy 'bueno', 'malo', 'regular')
    comentario: str = ""

    @property
    def es_subestandar(self) -> bool:
        v = self.valor.lower()
        return v in (ESTADO_SUBESTANDAR, "malo", "s")

@dataclass(frozen=True)
class EvaluacionSistemaResultado:
    sistema_id: str
    nombre_sistema: str
    estado_sistema: str  # 'aprobado' | 'no_aprobado'
    items: List[ItemEvaluacion]

class CalculadorDictamen:
    @staticmethod
    def calcular_estado_sistema(items: List[ItemEvaluacion]) -> str:
        """
        RN-04: Un sistema queda APROBADO si todos sus ítems son E (Estándar) o N/A.
        Si al menos un ítem es S (Subestándar), el sistema queda NO APROBADO.
        """
        if not items:
            return RESULTADO_SISTEMA_APROBADO
        
        for item in items:
            if item.es_subestandar:
                return RESULTADO_SISTEMA_NO_APROBADO
        
        return RESULTADO_SISTEMA_APROBADO

    @staticmethod
    def calcular_dictamen_general(sistemas_evaluados: List[EvaluacionSistemaResultado]) -> str:
        """
        RN-05: La inspección queda APROBADA solo si todos los sistemas están aprobados.
        Si al menos uno está No Aprobado, queda CON HALLAZGOS.
        """
        if not sistemas_evaluados:
            return DICTAMEN_APROBADO

        for s in sistemas_evaluados:
            if s.estado_sistema == RESULTADO_SISTEMA_NO_APROBADO:
                return DICTAMEN_CON_HALLAZGOS
        
        return DICTAMEN_APROBADO

    @staticmethod
    def requiere_segunda_revision(dictamen_general: str) -> bool:
        """
        RN-08: Si el dictamen general es 'con_hallazgos', es susceptible de requerir segunda revisión.
        """
        return dictamen_general == DICTAMEN_CON_HALLAZGOS
