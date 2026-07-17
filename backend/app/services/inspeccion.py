import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.inspeccion import Inspeccion, ChecklistItem, EvidenciaFotografica
from app.repositories.vehiculo import VehiculoRepository
from app.repositories.inspeccion import InspeccionRepository
from app.repositories.audit_log import AuditLogRepository
from app.schemas.inspeccion import InspeccionCreate, InspeccionUpdate

class InspeccionService:
    @staticmethod
    def create_inspeccion(
        db: Session,
        coordinador: Usuario,
        data: InspeccionCreate
    ) -> Inspeccion:
        """
        Crea una inspección validando el kilometraje del vehículo, guardando
        atónicamente las relaciones y registrando el AuditLog.
        """
        # 1. Validar existencia del vehículo
        vehiculo = VehiculoRepository.get_by_id(db, data.vehiculo_id)
        if not vehiculo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El vehículo seleccionado no existe."
            )
        
        # 2. Validar kilometraje (Regla de negocio: Km >= Km_actual)
        if data.kilometraje < vehiculo.kilometraje_actual:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El kilometraje ingresado ({data.kilometraje} Km) no puede ser menor al kilometraje actual del vehículo ({vehiculo.kilometraje_actual} Km)."
            )

        # 3. Crear instancia del modelo Inspeccion
        inspeccion = Inspeccion(
            vehiculo_id=data.vehiculo_id,
            coordinador_id=coordinador.id,
            kilometraje=data.kilometraje,
            resultado_general=data.resultado_general,
            mantenimiento_recomendado=data.mantenimiento_recomendado,
            firma_url=data.firma_url,
            observaciones=data.observaciones,
            fecha=datetime.now(timezone.utc)
        )

        # 4. Crear instancias de ChecklistItem y validar catálogo
        checklist_items = []
        catalog_map = {}
        
        for item in data.checklist_items:
            # Validar que el catalog_id existe
            cat_item = InspeccionRepository.get_catalog_item_by_id(db, item.catalogo_id)
            if not cat_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El item de catálogo con ID {item.catalogo_id} no existe."
                )
            
            check_item = ChecklistItem(
                catalogo_id=item.catalogo_id,
                valor=item.valor
            )
            checklist_items.append(check_item)
            # Guardamos mapeo temporal para resolver el ID de evidencia posterior
            catalog_map[item.catalogo_id] = check_item

        # 5. Crear instancias de EvidenciaFotografica
        evidencias = []
        for ev in data.evidencias:
            evidencia = EvidenciaFotografica(
                url=ev.url,
                descripcion=ev.descripcion
            )
            # Si se vinculó a un checklist_item_id (que el cliente envía como catalogo_id), 
            # buscaremos el ChecklistItem correspondiente para linkearlos tras el flush.
            if ev.checklist_item_id:
                matched_item = catalog_map.get(ev.checklist_item_id)
                if matched_item:
                    # Guardamos la referencia del objeto, la clave foránea se resolverá en la sesión
                    evidencia.checklist_item = matched_item
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La evidencia no pudo vincularse al item del checklist {ev.checklist_item_id} porque no está en el checklist enviado."
                    )
            evidencias.append(evidencia)

        # 6. Guardar en base de datos de manera atómica
        inspeccion = InspeccionRepository.create_inspeccion(
            db=db,
            inspeccion=inspeccion,
            items=checklist_items,
            evidencias=evidencias
        )

        # 7. Actualizar el kilometraje del vehículo
        VehiculoRepository.update_kilometraje(db, vehiculo, data.kilometraje)

        # 8. Registrar en log de auditoría
        AuditLogRepository.create_log(
            db=db,
            usuario_id=coordinador.id,
            accion="crear",
            entidad="inspeccion",
            entidad_id=str(inspeccion.id),
            ip="system",  # Se obtendrá del router
            detalle={
                "vehiculo_id": str(inspeccion.vehiculo_id),
                "patente": vehiculo.patente,
                "kilometraje": inspeccion.kilometraje,
                "resultado_general": inspeccion.resultado_general
            }
        )

        return inspeccion

    @staticmethod
    def update_inspeccion(
        db: Session,
        coordinador: Usuario,
        inspeccion_id: uuid.UUID,
        data: InspeccionUpdate,
        ip: str
    ) -> Inspeccion:
        """
        Modifica un reporte de inspección y calcula la diferencia (diff) para
        guardarla en el AuditLog.
        """
        inspeccion = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not inspeccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección no existe o fue eliminada."
            )
        
        vehiculo = VehiculoRepository.get_by_id(db, inspeccion.vehiculo_id)

        # Guardar valores antiguos para auditoría
        before_state = {
            "kilometraje": inspeccion.kilometraje,
            "resultado_general": inspeccion.resultado_general,
            "mantenimiento_recomendado": inspeccion.mantenimiento_recomendado,
            "firma_url": inspeccion.firma_url,
            "observaciones": inspeccion.observaciones
        }

        # Actualizar campos simples si vienen en el request
        if data.kilometraje is not None:
            # Validar kilometraje
            if data.kilometraje < vehiculo.kilometraje_actual and data.kilometraje != inspeccion.kilometraje:
                # Si es menor al kilometraje actual del auto (que incluye esta inspección), verificar que no rompa la coherencia
                # En un MVP, simplemente advertimos o bloqueamos si rompe la coherencia lógica.
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El kilometraje modificado ({data.kilometraje}) no puede ser menor al kilometraje actual registrado del vehículo ({vehiculo.kilometraje_actual})."
                )
            inspeccion.kilometraje = data.kilometraje
            # Actualizar también el vehículo si esta inspección registró su kilometraje más reciente
            if data.kilometraje > vehiculo.kilometraje_actual:
                VehiculoRepository.update_kilometraje(db, vehiculo, data.kilometraje)

        if data.resultado_general is not None:
            inspeccion.resultado_general = data.resultado_general
        if data.mantenimiento_recomendado is not None:
            inspeccion.mantenimiento_recomendado = data.mantenimiento_recomendado
        if data.firma_url is not None:
            inspeccion.firma_url = data.firma_url
        if data.observaciones is not None:
            inspeccion.observaciones = data.observaciones

        inspeccion.updated_at = datetime.now(timezone.utc)
        InspeccionRepository.save(db, inspeccion)

        # Crear diff
        after_state = {
            "kilometraje": inspeccion.kilometraje,
            "resultado_general": inspeccion.resultado_general,
            "mantenimiento_recomendado": inspeccion.mantenimiento_recomendado,
            "firma_url": inspeccion.firma_url,
            "observaciones": inspeccion.observaciones
        }

        diff = {
            "antes": {k: v for k, v in before_state.items() if before_state[k] != after_state[k]},
            "despues": {k: v for k, v in after_state.items() if before_state[k] != after_state[k]}
        }

        # Registrar auditoría
        AuditLogRepository.create_log(
            db=db,
            usuario_id=coordinador.id,
            accion="editar",
            entidad="inspeccion",
            entidad_id=str(inspeccion.id),
            ip=ip,
            detalle=diff
        )

        return inspeccion

    @staticmethod
    def delete_inspeccion(
        db: Session,
        coordinador: Usuario,
        inspeccion_id: uuid.UUID,
        ip: str
    ) -> Inspeccion:
        """
        Realiza una eliminación lógica (Soft Delete) de un reporte de inspección.
        """
        inspeccion = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not inspeccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección seleccionada no existe o ya fue eliminada."
            )
        
        # Soft delete
        InspeccionRepository.soft_delete(db, inspeccion)

        # Registrar auditoría
        AuditLogRepository.create_log(
            db=db,
            usuario_id=coordinador.id,
            accion="eliminar",
            entidad="inspeccion",
            entidad_id=str(inspeccion.id),
            ip=ip,
            detalle={"patente_vehiculo": inspeccion.vehiculo.patente, "fecha_original": str(inspeccion.fecha)}
        )

        return inspeccion
