from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc

from app.models.inspeccion import Inspeccion, ChecklistItem, CatalogoChecklist
from app.models.vehiculo import Vehiculo

class EstadisticasRepository:
    @staticmethod
    def get_kpi_resumen(db: Session) -> dict:
        total_vehiculos = db.query(Vehiculo).filter(Vehiculo.estado == "activo").count()
        total_inspecciones = db.query(Inspeccion).filter(Inspeccion.deleted_at == None).count()
        
        inspecciones_apto = db.query(Inspeccion)\
            .filter(Inspeccion.deleted_at == None, Inspeccion.resultado_general.in_(["aprobado", "apto"])).count()
        
        tasa_aptitud = round((inspecciones_apto / total_inspecciones * 100), 1) if total_inspecciones > 0 else 0.0

        return {
            "total_vehiculos": total_vehiculos,
            "total_inspecciones": total_inspecciones,
            "inspecciones_apto": inspecciones_apto,
            "inspecciones_no_apto": total_inspecciones - inspecciones_apto,
            "tasa_aptitud": tasa_aptitud,
            "mantenimientos_pendientes": 0,
            "mantenimientos_vencidos": 0
        }

    @staticmethod
    def get_inspecciones_por_mes(db: Session) -> list[dict]:
        """Obtiene la tendencia de inspecciones agrupadas por año-mes en los últimos 6 meses."""
        hace_6_meses = datetime.now() - timedelta(days=180)
        
        results = db.query(
            func.to_char(Inspeccion.fecha, 'YYYY-MM').label("mes"),
            func.count(Inspeccion.id).label("total"),
            func.count(case((Inspeccion.resultado_general.in_(['aprobado', 'apto']), 1))).label("aptos"),
            func.count(case((Inspeccion.resultado_general.in_(['con_hallazgos', 'no_apto']), 1))).label("no_aptos")
        ).filter(
            Inspeccion.deleted_at == None,
            Inspeccion.fecha >= hace_6_meses
        ).group_by("mes").order_by("mes").all()

        return [
            {"mes": r.mes, "total": r.total, "aptos": r.aptos, "no_aptos": r.no_aptos}
            for r in results
        ]

    @staticmethod
    def get_distribucion_resultados(db: Session) -> dict:
        aptos = db.query(Inspeccion).filter(Inspeccion.deleted_at == None, Inspeccion.resultado_general.in_(["aprobado", "apto"])).count()
        no_aptos = db.query(Inspeccion).filter(Inspeccion.deleted_at == None, Inspeccion.resultado_general.in_(["con_hallazgos", "no_apto"])).count()
        return {"aptos": aptos, "no_aptos": no_aptos}

    @staticmethod
    def get_top_vehiculos_inspeccionados(db: Session, limit: int = 5) -> list[dict]:
        results = db.query(
            Vehiculo.patente,
            Vehiculo.marca,
            Vehiculo.modelo,
            func.count(Inspeccion.id).label("total_inspecciones")
        ).join(Inspeccion, Vehiculo.id == Inspeccion.vehiculo_id)\
         .filter(Inspeccion.deleted_at == None)\
         .group_by(Vehiculo.id, Vehiculo.patente, Vehiculo.marca, Vehiculo.modelo)\
         .order_by(desc("total_inspecciones"))\
         .limit(limit).all()

        return [
            {
                "vehiculo": f"{r.marca} {r.modelo} ({r.patente})",
                "total_inspecciones": r.total_inspecciones
            }
            for r in results
        ]

    @staticmethod
    def get_items_mas_fallados(db: Session, limit: int = 5) -> list[dict]:
        results = db.query(
            CatalogoChecklist.nombre,
            func.count(ChecklistItem.id).label("fallas")
        ).join(ChecklistItem, CatalogoChecklist.id == ChecklistItem.catalogo_id)\
         .filter(ChecklistItem.valor.in_(["subestandar", "malo", "regular", "s"]))\
         .group_by(CatalogoChecklist.id, CatalogoChecklist.nombre)\
         .order_by(desc("fallas"))\
         .limit(limit).all()

        return [
            {"item": r.nombre.capitalize(), "fallas": r.fallas}
            for r in results
        ]

    @staticmethod
    def get_mantenimientos_por_estado(db: Session) -> list[dict]:
        return []
