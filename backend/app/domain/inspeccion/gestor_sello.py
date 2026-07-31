"""
Domain Service: GestorSelloAprobacion
Pure business domain logic — seal generation for approved inspections.
Enforces RN-12, ADJ-02.
"""
from dataclasses import dataclass
from datetime import datetime

EMPRESA_NOMBRE_DEFECTO = "Sointer Ltda."
EMPRESA_NIT_DEFECTO = "900.467.017-4"

@dataclass(frozen=True)
class SelloAprobacion:
    empresa_nombre: str
    empresa_nit: str
    numero_inspeccion: int
    fecha_creacion_str: str
    fecha_aprobacion_str: str
    aprobado_por_nombre: str
    firma_jefe_url: str
    leyenda: str = "APROBADO"

    def to_dict(self) -> dict:
        return {
            "empresa_nombre": self.empresa_nombre,
            "empresa_nit": self.empresa_nit,
            "numero_inspeccion": self.numero_inspeccion,
            "fecha_creacion": self.fecha_creacion_str,
            "fecha_aprobacion": self.fecha_aprobacion_str,
            "aprobado_por": self.aprobado_por_nombre,
            "firma_jefe_url": self.firma_jefe_url,
            "leyenda": self.leyenda,
        }

class GestorSelloAprobacion:
    @staticmethod
    def generar_sello(
        numero_inspeccion: int,
        fecha_creacion: datetime,
        fecha_aprobacion: datetime,
        nombre_jefe: str,
        firma_jefe_url: str,
        empresa_nombre: str = EMPRESA_NOMBRE_DEFECTO,
        empresa_nit: str = EMPRESA_NIT_DEFECTO,
    ) -> SelloAprobacion:
        """
        RN-12 / ADJ-02: Genera la estructura de datos del sello digital de aprobación.
        """
        fmt_creacion = fecha_creacion.strftime("%Y-%m-%d %H:%M:%S")
        fmt_aprobacion = fecha_aprobacion.strftime("%Y-%m-%d %H:%M:%S")

        return SelloAprobacion(
            empresa_nombre=empresa_nombre,
            empresa_nit=empresa_nit,
            numero_inspeccion=numero_inspeccion,
            fecha_creacion_str=fmt_creacion,
            fecha_aprobacion_str=fmt_aprobacion,
            aprobado_por_nombre=nombre_jefe,
            firma_jefe_url=firma_jefe_url,
            leyenda="APROBADO"
        )
