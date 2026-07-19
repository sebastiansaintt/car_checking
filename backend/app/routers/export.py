import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.usuario import Usuario
from app.services.export import ExportService

router = APIRouter(prefix="/export", tags=["Exportación"])

@router.get("/inspecciones")
def export_inspecciones_excel(
    request: Request,
    vehiculo_id: Optional[uuid.UUID] = None,
    coordinador_id: Optional[uuid.UUID] = None,
    resultado_general: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Genera y descarga un reporte en formato Excel (.xlsx) con el resumen
    y detalle del checklist de las inspecciones filtradas.
    Registra el evento de exportación en el AuditLog.
    """
    ip = request.client.host if request.client else "unknown"

    excel_buffer = ExportService.generate_inspecciones_excel(
        db=db,
        usuario=current_user,
        ip=ip,
        vehiculo_id=vehiculo_id,
        coordinador_id=coordinador_id,
        resultado_general=resultado_general,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    filename = f"reporte_inspecciones_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
