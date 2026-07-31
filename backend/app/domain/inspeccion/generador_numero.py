"""
Domain Service: GeneradorNumeroInspeccion
Genera el número correlativo único de inspección (RN-09, RN-12).
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.inspeccion import Inspeccion

class GeneradorNumeroInspeccion:
    @staticmethod
    def obtener_siguiente_numero(db: Session) -> int:
        """
        Calcula de forma segura el siguiente número correlativo de inspección (mínimo 4800).
        """
        max_num = db.query(func.max(Inspeccion.numero_inspeccion)).scalar()
        if max_num and max_num >= 4800:
            return max_num + 1
        return 4800
