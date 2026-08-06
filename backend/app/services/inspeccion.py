import uuid
from functools import wraps
from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.inspeccion import Inspeccion, ChecklistItem
from app.models.evaluacion_sistema import EvaluacionSistema
from app.models.hallazgo import Hallazgo
from app.models.firma_tecnico import FirmaTecnico

from app.repositories.vehiculo import VehiculoRepository
from app.repositories.inspeccion import InspeccionRepository
from app.repositories.hallazgo import HallazgoRepository
from app.repositories.firma_tecnico import FirmaTecnicoRepository
from app.repositories.audit_log import AuditLogRepository
from app.services.notificacion import NotificacionService
from app.schemas.inspeccion import InspeccionCreate, InspeccionUpdate, InspeccionAprobarRequest

from app.domain.inspeccion.calculador_dictamen import (
    CalculadorDictamen,
    ItemEvaluacion,
    EvaluacionSistemaResultado,
    DICTAMEN_APROBADO,
    DICTAMEN_CON_HALLAZGOS,
    RESULTADO_SISTEMA_APROBADO
)
from app.domain.inspeccion.maquina_estado import (
    MaquinaEstadoInspeccion,
    EstadoInspeccion,
    EventoInspeccion
)
from app.domain.inspeccion.gestor_sello import GestorSelloAprobacion
from app.domain.inspeccion.generador_numero import GeneradorNumeroInspeccion


class InspeccionService:
    @staticmethod
    def create_inspeccion(
        db: Session,
        tecnico: Usuario,
        data: InspeccionCreate
    ) -> Inspeccion:
        """
        Crea una inspección o subregistro validando el vehículo (alta dinámica por placa),
        calculando dictámenes por sistema y general, generando hallazgos y registrando firmas.
        Hora en formato America/Bogota (Hora Colombia).
        """
        hora_colombia = datetime.now(ZoneInfo("America/Bogota"))

        # 1. Obtener o crear vehículo por placa
        vehiculo = VehiculoRepository.get_or_create_by_placa(
            db=db,
            placa=data.placa,
            empresa_contratista_id=data.empresa_contratista_id,
            marca=data.marca,
            modelo=data.modelo,
            año=data.año,
            tipo_vehiculo=data.tipo_vehiculo,
            numero_interno=data.numero_interno,
            color=data.color,
            equipo_auxiliar=data.equipo_auxiliar,
            area_transitar=data.area_transitar,
            kilometraje=data.kilometraje
        )

        # 2. Validar kilometraje (Km >= Km_actual)
        if data.kilometraje < vehiculo.kilometraje_actual:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El kilometraje ingresado ({data.kilometraje} Km) no puede ser menor al kilometraje actual del vehículo ({vehiculo.kilometraje_actual} Km)."
            )

        # 3. Determinar si es subregistro o registro primario
        primario_id = data.inspeccion_primaria_id
        numero_inspeccion = None
        numero_revision = 1

        if primario_id:
            primario = InspeccionRepository.get_by_id(db, primario_id)
            if not primario:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="La inspección primaria especificada no existe."
                )
            numero_inspeccion = primario.numero_inspeccion
            subregistros = InspeccionRepository.get_subregistros_by_primario(db, primario.id)
            numero_revision = len(subregistros) + 2
        else:
            # Si no viene primario_id, verificar si ya existe una primaría previa para esta placa
            primaria_existente = InspeccionRepository.get_primario_by_placa(db, data.placa)
            if primaria_existente:
                primario_id = primaria_existente.id
                numero_inspeccion = primaria_existente.numero_inspeccion
                subregistros = InspeccionRepository.get_subregistros_by_primario(db, primaria_existente.id)
                numero_revision = len(subregistros) + 2
            else:
                numero_inspeccion = GeneradorNumeroInspeccion.obtener_siguiente_numero(db)
                numero_revision = 1

        # 4. Procesar catálogo de ítems y agrupar por sistema
        sistemas_map = {}
        checklist_items = []
        catalog_map = {}

        for item_in in data.checklist_items:
            cat_item = InspeccionRepository.get_catalog_item_by_id(db, item_in.catalogo_id)
            if not cat_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El ítem de catálogo con ID {item_in.catalogo_id} no existe."
                )
            
            check_item = ChecklistItem(
                catalogo_id=item_in.catalogo_id,
                valor=item_in.valor,
                comentario=item_in.comentario
            )
            checklist_items.append(check_item)
            catalog_map[item_in.catalogo_id] = check_item

            sys_id = str(cat_item.sistema_id) if cat_item.sistema_id else "general"
            item_domain = ItemEvaluacion(
                catalogo_id=str(item_in.catalogo_id),
                valor=item_in.valor,
                comentario=item_in.comentario or ""
            )
            if sys_id not in sistemas_map:
                sistemas_map[sys_id] = []
            sistemas_map[sys_id].append(item_domain)

        # 5. Calcular dictamen por sistema y dictamen general usando el Dominio (DDD)
        evaluaciones_sistema_models = []
        evaluaciones_resultados_domain = []

        all_sistemas_catalog = InspeccionRepository.get_sistemas_catalog(db)
        for sys_cat in all_sistemas_catalog:
            sys_id_str = str(sys_cat.id)
            items_sys = sistemas_map.get(sys_id_str, [])
            estado_sys = CalculadorDictamen.calcular_estado_sistema(items_sys)

            eval_model = EvaluacionSistema(
                sistema_id=sys_cat.id,
                estado_sistema=estado_sys
            )
            evaluaciones_sistema_models.append(eval_model)

            res_domain = EvaluacionSistemaResultado(
                sistema_id=sys_id_str,
                nombre_sistema=sys_cat.nombre,
                estado_sistema=estado_sys,
                items=items_sys
            )
            evaluaciones_resultados_domain.append(res_domain)

        dictamen_general = CalculadorDictamen.calcular_dictamen_general(evaluaciones_resultados_domain)
        
        evento_inicial = EventoInspeccion.CREAR_CON_HALLAZGOS if dictamen_general == DICTAMEN_CON_HALLAZGOS else EventoInspeccion.CREAR_SIN_HALLAZGOS
        estado_inicial = MaquinaEstadoInspeccion.transicionar(EstadoInspeccion.EN_REVISION.value, evento_inicial.value)

        # 6. Crear la entidad Inspección (Inmutable)
        inspeccion = Inspeccion(
            numero_inspeccion=numero_inspeccion,
            numero_revision=numero_revision,
            inspeccion_primaria_id=primario_id,
            motivo_actualizacion=data.motivo_actualizacion,
            fecha_actualizacion=hora_colombia if primario_id else None,
            vehiculo_id=vehiculo.id,
            empresa_contratista_id=data.empresa_contratista_id or vehiculo.empresa_contratista_id,
            creado_por_id=tecnico.id,
            fecha=hora_colombia.replace(tzinfo=None),
            hora_inspeccion=data.hora_inspeccion or hora_colombia.strftime("%H:%M"),
            kilometraje=data.kilometraje,
            area_transitar=data.area_transitar,
            equipo_auxiliar=data.equipo_auxiliar,
            estado=estado_inicial,
            resultado_general=dictamen_general,
            mantenimiento_recomendado=data.mantenimiento_recomendado,
            observaciones=data.observaciones
        )

        # 7. Persistir inspección
        inspeccion = InspeccionRepository.create_inspeccion(
            db=db,
            inspeccion=inspeccion,
            evaluaciones=evaluaciones_sistema_models,
            items=checklist_items
        )

        # 8. Generar Hallazgos automáticamente para ítems subestándar (RN-06)
        for item_model in checklist_items:
            val_lower = item_model.valor.lower()
            if val_lower in ("subestandar", "malo", "s"):
                cat_info = catalog_map.get(item_model.catalogo_id)
                cat_nombre = cat_info.catalogo_nombre if cat_info else "Ítem subestándar"
                hallazgo = Hallazgo(
                    inspeccion_id=inspeccion.id,
                    item_checklist_id=item_model.id,
                    descripcion=f"Hallazgo en {cat_nombre}: {item_model.comentario or 'Requiere atención'}",
                    atendido=False
                )
                HallazgoRepository.create(db, hallazgo)

        # 9. Registrar Firma del Técnico Logueado + Adicionales (RN-10)
        FirmaTecnicoRepository.registrar_firma_tecnico_logueado(
            db=db,
            inspeccion_id=inspeccion.id,
            usuario_id=tecnico.id,
            firma_url=data.firma_url
        )

        for nombre_adic in data.nombres_tecnicos_adicionales[:2]:
            if nombre_adic and nombre_adic.strip():
                FirmaTecnicoRepository.registrar_tecnico_adicional(
                    db=db,
                    inspeccion_id=inspeccion.id,
                    nombre_adicional=nombre_adic
                )

        # 10. Actualizar kilometraje del vehículo
        VehiculoRepository.update_kilometraje(db, vehiculo, data.kilometraje)

        # 11. Auditoría y Notificaciones a Programador e Ingeniero
        AuditLogRepository.create_log(
            db=db,
            usuario_id=tecnico.id,
            accion="crear_subregistro" if primario_id else "crear",
            entidad="inspeccion",
            entidad_id=str(inspeccion.id),
            ip="system",
            detalle={
                "numero_inspeccion": inspeccion.numero_inspeccion,
                "numero_revision": inspeccion.numero_revision,
                "patente": vehiculo.patente,
                "dictamen_general": dictamen_general,
                "estado": estado_inicial,
                "es_subregistro": primario_id is not None
            }
        )

        icono = "🔴" if dictamen_general == DICTAMEN_CON_HALLAZGOS else "🟢"
        tipo_notif = "subregistro" if primario_id else "nueva_inspeccion"
        
        for target_role in ["programador", "ingeniero", "jefe_inspeccion"]:
            NotificacionService.notificar_por_rol(
                db=db,
                rol=target_role,
                tipo=f"inspeccion_{dictamen_general}",
                titulo=f"{icono} {'Subregistro' if primario_id else 'Nueva Inspección'} N°{inspeccion.numero_inspeccion} (Rev #{inspeccion.numero_revision})",
                mensaje=f"Vehículo {vehiculo.patente} fue inspeccionado por {tecnico.nombre}. Dictamen: {dictamen_general.upper()}.",
                referencia_id=str(inspeccion.id),
                referencia_tipo="inspeccion"
            )

        db.commit()
        return InspeccionRepository.get_by_id(db, inspeccion.id)

    @staticmethod
    def corregir_inspeccion(
        db: Session,
        tecnico: Usuario,
        inspeccion_id: uuid.UUID,
        data: InspeccionUpdate
    ) -> Inspeccion:
        """
        Historial Inmutable (Regla de Oro):
        Editar = Crear un nuevo subregistro de la cadena. NUNCA sobreescribir in-place.
        """
        target = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección a corregir no existe."
            )

        primario_id = target.inspeccion_primaria_id or target.id
        subregistros = InspeccionRepository.get_subregistros_by_primario(db, primario_id)
        numero_revision = len(subregistros) + 2
        hora_colombia = datetime.now(ZoneInfo("America/Bogota"))

        # Heredar items si no vienen nuevos en el payload
        items_payload = data.checklist_items
        if not items_payload:
            items_payload = [
                ChecklistItem(
                    catalogo_id=it.catalogo_id,
                    valor=it.valor,
                    comentario=it.comentario
                ) for it in target.checklist_items
            ]

        # Crear payload de InspeccionCreate para el nuevo subregistro
        create_payload = InspeccionCreate(
            placa=target.vehiculo.patente if target.vehiculo else "ABC 123",
            empresa_contratista_id=target.empresa_contratista_id,
            marca=target.vehiculo.marca if target.vehiculo else "N/A",
            modelo=target.vehiculo.modelo if target.vehiculo else "N/A",
            año=target.vehiculo.año if target.vehiculo else 2020,
            tipo_vehiculo=target.vehiculo.tipo_vehiculo if target.vehiculo else "Camioneta",
            numero_interno=target.vehiculo.numero_interno,
            color=target.vehiculo.color,
            equipo_auxiliar=target.equipo_auxiliar,
            area_transitar=target.area_transitar,
            kilometraje=data.kilometraje if data.kilometraje is not None else target.kilometraje,
            hora_inspeccion=hora_colombia.strftime("%H:%M"),
            mantenimiento_recomendado=data.mantenimiento_recomendado or target.mantenimiento_recomendado,
            observaciones=data.observaciones or target.observaciones,
            inspeccion_primaria_id=primario_id,
            motivo_actualizacion=data.motivo_actualizacion or "correccion_hallazgos",
            fecha_actualizacion=data.fecha_actualizacion or hora_colombia,
            firma_url=tecnico.firma_url or "https://placeholder.firmas/tecnico.png",
            checklist_items=items_payload
        )

        subregistro_nuevo = InspeccionService.create_inspeccion(db=db, tecnico=tecnico, data=create_payload)

        # Marcar hallazgos del registro previo como atendidos
        hallazgos_previos = HallazgoRepository.get_by_inspeccion(db, target.id)
        for h in hallazgos_previos:
            HallazgoRepository.marcar_atendido(db, h)

        return subregistro_nuevo

    @staticmethod
    def aprobar_inspeccion(
        db: Session,
        jefe: Usuario,
        inspeccion_id: uuid.UUID,
        data: InspeccionAprobarRequest
    ) -> Inspeccion:
        """
        Aprueba la inspección, valida precriterios, genera sello digital
        y calcula fecha de próxima revisión (+ 6 meses).
        """
        inspeccion = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not inspeccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección seleccionada no existe."
            )

        hallazgos_pendientes = HallazgoRepository.get_pendientes_by_inspeccion(db, inspeccion.id)
        if not MaquinaEstadoInspeccion.puede_aprobar(inspeccion.estado, len(hallazgos_pendientes)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede aprobar la inspección. Debe estar en 'pendiente_aprobacion' y no tener hallazgos sin atender. Hallazgos pendientes: {len(hallazgos_pendientes)}."
            )

        nuevo_estado = MaquinaEstadoInspeccion.transicionar(inspeccion.estado, EventoInspeccion.APROBAR.value)
        inspeccion.estado = nuevo_estado
        inspeccion.fecha_aprobacion = datetime.now(timezone.utc)
        inspeccion.aprobado_por_id = jefe.id
        inspeccion.fecha_proxima_revision = date.today() + timedelta(days=180)

        FirmaTecnicoRepository.registrar_firma_aprobador(
            db=db,
            inspeccion_id=inspeccion.id,
            jefe_id=jefe.id,
            firma_url=data.firma_url
        )

        sello = GestorSelloAprobacion.generar_sello(
            numero_inspeccion=inspeccion.numero_inspeccion,
            fecha_creacion=inspeccion.fecha,
            fecha_aprobacion=inspeccion.fecha_aprobacion,
            nombre_jefe=jefe.nombre,
            firma_jefe_url=data.firma_url
        )
        inspeccion.sello_url = str(sello.to_dict())

        InspeccionRepository.save(db, inspeccion)

        NotificacionService.notificar_por_rol(
            db=db,
            rol="tecnico_inspector",
            tipo="inspeccion_aprobada",
            titulo=f"🟢 Inspección N°{inspeccion.numero_inspeccion} APROBADA",
            mensaje=f"La inspección del vehículo {inspeccion.vehiculo.patente} fue aprobada por {jefe.nombre}.",
            referencia_id=str(inspeccion.id),
            referencia_tipo="inspeccion"
        )

        return InspeccionRepository.get_by_id(db, inspeccion.id)

    @staticmethod
    def marcar_hallazgo_atendido(
        db: Session,
        usuario: Usuario,
        hallazgo_id: uuid.UUID
    ) -> Hallazgo:
        hallazgo = HallazgoRepository.get_by_id(db, hallazgo_id)
        if not hallazgo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El hallazgo seleccionado no existe."
            )

        hallazgo = HallazgoRepository.marcar_atendido(db, hallazgo)
        
        pendientes = HallazgoRepository.get_pendientes_by_inspeccion(db, hallazgo.inspeccion_id)
        if len(pendientes) == 0:
            inspeccion = InspeccionRepository.get_by_id(db, hallazgo.inspeccion_id)
            if inspeccion and inspeccion.estado == EstadoInspeccion.CON_HALLAZGOS.value:
                inspeccion.estado = MaquinaEstadoInspeccion.transicionar(
                    inspeccion.estado,
                    EventoInspeccion.ATENDER_TODOS_HALLAZGOS.value
                )
                InspeccionRepository.save(db, inspeccion)

        db.commit()
        return hallazgo

    @staticmethod
    def list_inspecciones(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        vehiculo_id: Optional[uuid.UUID] = None,
        empresa_contratista_id: Optional[uuid.UUID] = None,
        coordinador_id: Optional[uuid.UUID] = None,
        estado: Optional[str] = None,
        resultado_general: Optional[str] = None,
        fecha_inicio: Optional[datetime] = None,
        fecha_fin: Optional[datetime] = None
    ) -> List[Inspeccion]:
        return InspeccionRepository.get_all_active(
            db=db,
            skip=skip,
            limit=limit,
            vehiculo_id=vehiculo_id,
            empresa_contratista_id=empresa_contratista_id,
            coordinador_id=coordinador_id,
            estado=estado,
            resultado_general=resultado_general,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )
