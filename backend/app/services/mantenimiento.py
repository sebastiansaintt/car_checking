import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.mantenimiento import Mantenimiento
from app.repositories.mantenimiento import MantenimientoRepository
from app.repositories.vehiculo import VehiculoRepository
from app.repositories.audit_log import AuditLogRepository
from app.services.notificacion import NotificacionService
from app.schemas.mantenimiento import MantenimientoCreate, MantenimientoUpdate

class MantenimientoService:
    @staticmethod
    def crear_orden(
        db: Session,
        coordinador: Usuario,
        data: MantenimientoCreate
    ) -> Mantenimiento:
        # 1. Validar vehículo
        vehiculo = VehiculoRepository.get_by_id(db, data.vehiculo_id)
        if not vehiculo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El vehículo seleccionado no existe."
            )

        # 2. Validar tipo
        if data.tipo not in ["preventivo", "correctivo"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El tipo de mantenimiento debe ser 'preventivo' o 'correctivo'."
            )

        # 3. Validar fecha límite
        if data.fecha_limite < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La fecha límite de mantenimiento no puede ser en el pasado."
            )

        # 4. Crear objeto Mantenimiento
        mantenimiento = Mantenimiento(
            vehiculo_id=data.vehiculo_id,
            coordinador_id=coordinador.id,
            inspeccion_origen_id=data.inspeccion_origen_id,
            tipo=data.tipo,
            descripcion=data.descripcion,
            fecha_limite=data.fecha_limite,
            kilometraje_al_crear=vehiculo.kilometraje_actual,
            estado="pendiente",
            observaciones=data.observaciones
        )

        mantenimiento = MantenimientoRepository.create(db, mantenimiento)

        # Actualizar fecha de próximo mantenimiento en el vehículo
        vehiculo.fecha_proximo_mantenimiento = data.fecha_limite
        VehiculoRepository.save(db, vehiculo) if hasattr(VehiculoRepository, 'save') else db.add(vehiculo)
        db.commit()

        # Registrar auditoría
        AuditLogRepository.create_log(
            db=db,
            usuario_id=coordinador.id,
            accion="crear",
            entidad="mantenimiento",
            entidad_id=str(mantenimiento.id),
            ip="system",
            detalle={
                "vehiculo_patente": vehiculo.patente,
                "tipo": data.tipo,
                "descripcion": data.descripcion,
                "fecha_limite": str(data.fecha_limite)
            }
        )

        # Notificar in-app al gerente
        NotificacionService.notificar_por_rol(
            db=db,
            rol="gerente",
            tipo="mantenimiento_creado",
            titulo=f"🔧 Orden de Mantenimiento {data.tipo.capitalize()}",
            mensaje=f"Coordinador {coordinador.nombre} programó mantenimiento para vehículo {vehiculo.patente} ({vehiculo.marca} {vehiculo.modelo}) hasta el {data.fecha_limite}.",
            referencia_id=str(mantenimiento.id),
            referencia_tipo="mantenimiento"
        )

        # Resolver campos de respuesta
        mantenimiento.vehiculo_patente = vehiculo.patente
        mantenimiento.vehiculo_modelo = f"{vehiculo.marca} {vehiculo.modelo}"
        mantenimiento.coordinador_nombre = coordinador.nombre

        return mantenimiento

    @staticmethod
    def actualizar_orden(
        db: Session,
        coordinador: Usuario,
        mantenimiento_id: uuid.UUID,
        data: MantenimientoUpdate
    ) -> Mantenimiento:
        mantenimiento = MantenimientoRepository.get_by_id(db, mantenimiento_id)
        if not mantenimiento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La orden de mantenimiento no existe."
            )

        vehiculo = mantenimiento.vehiculo

        if data.observaciones is not None:
            mantenimiento.observaciones = data.observaciones

        if data.estado:
            if data.estado not in ["pendiente", "en_progreso", "completado", "vencido"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Estado no válido."
                )

            # Si pasa a completado
            if data.estado == "completado":
                if data.kilometraje_al_completar is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Debe ingresar el kilometraje actual al completar el mantenimiento."
                    )
                if data.kilometraje_al_completar < vehiculo.kilometraje_actual:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El kilometraje ingresado ({data.kilometraje_al_completar} Km) no puede ser menor al kilometraje registrado del vehículo ({vehiculo.kilometraje_actual} Km)."
                    )

                mantenimiento.estado = "completado"
                mantenimiento.fecha_completado = datetime.now(timezone.utc)
                mantenimiento.kilometraje_al_completar = data.kilometraje_al_completar

                # Actualizar vehículo
                vehiculo.kilometraje_actual = data.kilometraje_al_completar
                vehiculo.fecha_ultimo_mantenimiento = date.today()
                vehiculo.fecha_proximo_mantenimiento = None
                db.add(vehiculo)

                # Notificar al gerente
                NotificacionService.notificar_por_rol(
                    db=db,
                    rol="gerente",
                    tipo="mantenimiento_completado",
                    titulo="✅ Mantenimiento Completado",
                    mensaje=f"Se ha completado el mantenimiento {mantenimiento.tipo} del vehículo {vehiculo.patente} con {data.kilometraje_al_completar} Km.",
                    referencia_id=str(mantenimiento.id),
                    referencia_tipo="mantenimiento"
                )
            else:
                mantenimiento.estado = data.estado

        mantenimiento = MantenimientoRepository.save(db, mantenimiento)

        # Audit log
        AuditLogRepository.create_log(
            db=db,
            usuario_id=coordinador.id,
            accion="editar",
            entidad="mantenimiento",
            entidad_id=str(mantenimiento.id),
            ip="system",
            detalle={"estado": mantenimiento.estado, "kilometraje_completado": mantenimiento.kilometraje_al_completar}
        )

        mantenimiento.vehiculo_patente = vehiculo.patente
        mantenimiento.vehiculo_modelo = f"{vehiculo.marca} {vehiculo.modelo}"
        mantenimiento.coordinador_nombre = mantenimiento.coordinador.nombre if mantenimiento.coordinador else "Coordinador"

        return mantenimiento

    @staticmethod
    def list_mantenimientos(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        vehiculo_id: Optional[uuid.UUID] = None,
        tipo: Optional[str] = None,
        estado: Optional[str] = None
    ) -> list[Mantenimiento]:
        mantenimientos = MantenimientoRepository.get_all(
            db=db, skip=skip, limit=limit, vehiculo_id=vehiculo_id, tipo=tipo, estado=estado
        )
        # Asegurar resolución de propiedades para respuesta API
        for m in mantenimientos:
            m.vehiculo_patente = m.vehiculo.patente if m.vehiculo else "N/A"
            m.vehiculo_modelo = f"{m.vehiculo.marca} {m.vehiculo.modelo}" if m.vehiculo else "N/A"
            m.coordinador_nombre = m.coordinador.nombre if m.coordinador else "N/A"
        return mantenimientos

    @staticmethod
    def verificar_vencimientos(db: Session) -> dict:
        """
        Revisa las fechas límites de los mantenimientos.
        - Notifica si faltan 3 días o si es el día de vencimiento.
        - Marca como 'vencido' si fecha_limite < hoy y no está completado.
        """
        hoy = date.today()
        tres_dias = hoy + timedelta(days=3)

        mantenimientos = MantenimientoRepository.get_pendientes_o_vencidos(db)
        actualizados = 0
        notificados = 0

        for m in mantenimientos:
            veh = m.vehiculo
            patente = veh.patente if veh else "Vehículo"

            # Check 1: Vencimiento pasado
            if m.fecha_limite < hoy:
                if m.estado != "vencido":
                    m.estado = "vencido"
                    MantenimientoRepository.save(db, m)
                    actualizados += 1

                    # Notificar a ambos roles
                    mensaje = f"⚠️ ALERTA: El mantenimiento ({m.descripcion}) del vehículo {patente} ha VENCIDO (Fecha límite era {m.fecha_limite})."
                    NotificacionService.notificar_por_rol(
                        db=db, rol="gerente", tipo="mantenimiento_vencido",
                        titulo="🚨 Mantenimiento Vencido", mensaje=mensaje,
                        referencia_id=str(m.id), referencia_tipo="mantenimiento"
                    )
                    NotificacionService.notificar_por_rol(
                        db=db, rol="coordinador", tipo="mantenimiento_vencido",
                        titulo="🚨 Mantenimiento Vencido", mensaje=mensaje,
                        referencia_id=str(m.id), referencia_tipo="mantenimiento"
                    )
                    notificados += 1

            # Check 2: Día de vencimiento (hoy)
            elif m.fecha_limite == hoy:
                mensaje = f"⏰ Recordatorio: El mantenimiento ({m.descripcion}) del vehículo {patente} vence HOY."
                NotificacionService.notificar_por_rol(
                    db=db, rol="coordinador", tipo="mantenimiento_proximo",
                    titulo="⏰ Mantenimiento Vence Hoy", mensaje=mensaje,
                    referencia_id=str(m.id), referencia_tipo="mantenimiento"
                )
                notificados += 1

            # Check 3: Faltan 3 días
            elif m.fecha_limite == tres_dias:
                mensaje = f"📅 Recordatorio: El mantenimiento ({m.descripcion}) del vehículo {patente} vence en 3 días ({m.fecha_limite})."
                NotificacionService.notificar_por_rol(
                    db=db, rol="coordinador", tipo="mantenimiento_proximo",
                    titulo="📅 Mantenimiento Próximo (3 días)", mensaje=mensaje,
                    referencia_id=str(m.id), referencia_tipo="mantenimiento"
                )
                notificados += 1

        return {"vencidos_marcados": actualizados, "notificaciones_enviadas": notificados}
