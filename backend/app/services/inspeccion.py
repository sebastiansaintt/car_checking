import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.usuario import Usuario
from app.models.inspeccion import Inspeccion, ChecklistItem, EvidenciaFotografica
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
    DICTAMEN_CON_HALLAZGOS
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
        Crea una inspección validando el vehículo (alta dinámica por placa),
        calculando dictámenes por sistema y general a través de la capa de dominio,
        generando hallazgos y registrando la firma del técnico logueado y adicionales.
        """
        # 1. Obtener o crear vehículo por placa (ADJ-01)
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

        # 3. Procesar catálogo de ítems y agrupar por sistema
        sistemas_map = {}  # sistema_id -> list of ItemEvaluacion
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

            # Agrupar para cálculo de dominio por sistema
            sys_id = str(cat_item.sistema_id) if cat_item.sistema_id else "general"
            item_domain = ItemEvaluacion(
                catalogo_id=str(item_in.catalogo_id),
                valor=item_in.valor,
                comentario=item_in.comentario or ""
            )
            if sys_id not in sistemas_map:
                sistemas_map[sys_id] = []
            sistemas_map[sys_id].append(item_domain)

        # 4. Calcular dictamen por sistema y dictamen general usando el Dominio (DDD)
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
        
        # Determinar estado inicial con la máquina de estados
        evento_inicial = EventoInspeccion.CREAR_CON_HALLAZGOS if dictamen_general == DICTAMEN_CON_HALLAZGOS else EventoInspeccion.CREAR_SIN_HALLAZGOS
        estado_inicial = MaquinaEstadoInspeccion.transicionar(EstadoInspeccion.EN_REVISION.value, evento_inicial.value)

        # 5. Crear la entidad Inspección
        inspeccion = Inspeccion(
            numero_inspeccion=GeneradorNumeroInspeccion.obtener_siguiente_numero(db),
            vehiculo_id=vehiculo.id,
            empresa_contratista_id=data.empresa_contratista_id or vehiculo.empresa_contratista_id,
            creado_por_id=tecnico.id,
            fecha=datetime.now(timezone.utc),
            hora_inspeccion=data.hora_inspeccion or datetime.now().strftime("%H:%M"),
            kilometraje=data.kilometraje,
            area_transitar=data.area_transitar,
            equipo_auxiliar=data.equipo_auxiliar,
            estado=estado_inicial,
            resultado_general=dictamen_general,
            mantenimiento_recomendado=data.mantenimiento_recomendado,
            observaciones=data.observaciones
        )

        # 6. Evidencias fotográficas
        evidencias = []
        for ev in data.evidencias:
            evidencia = EvidenciaFotografica(
                url=ev.url,
                descripcion=ev.descripcion
            )
            if ev.checklist_item_id:
                matched_item = catalog_map.get(ev.checklist_item_id)
                if matched_item:
                    evidencia.checklist_item = matched_item
            evidencias.append(evidencia)

        # 7. Persistir inspección, evaluaciones, checklist y evidencias atómicamente
        inspeccion = InspeccionRepository.create_inspeccion(
            db=db,
            inspeccion=inspeccion,
            evaluaciones=evaluaciones_sistema_models,
            items=checklist_items,
            evidencias=evidencias
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

        # 11. Auditoría y Notificaciones
        AuditLogRepository.create_log(
            db=db,
            usuario_id=tecnico.id,
            accion="crear",
            entidad="inspeccion",
            entidad_id=str(inspeccion.id),
            ip="system",
            detalle={
                "numero_inspeccion": inspeccion.numero_inspeccion,
                "patente": vehiculo.patente,
                "dictamen_general": dictamen_general,
                "estado": estado_inicial
            }
        )

        icono = "🔴" if dictamen_general == DICTAMEN_CON_HALLAZGOS else "🟡"
        NotificacionService.notificar_por_rol(
            db=db,
            rol="jefe_inspeccion",
            tipo=f"inspeccion_{dictamen_general}",
            titulo=f"{icono} Nueva Inspección N°{inspeccion.numero_inspeccion}",
            mensaje=f"Vehículo {vehiculo.patente} fue inspeccionado por {tecnico.nombre}. Estado: {estado_inicial.upper()}.",
            referencia_id=str(inspeccion.id),
            referencia_tipo="inspeccion"
        )

        db.commit()
        return InspeccionRepository.get_by_id(db, inspeccion.id)

    @staticmethod
    def aprobar_inspeccion(
        db: Session,
        jefe: Usuario,
        inspeccion_id: uuid.UUID,
        data: InspeccionAprobarRequest
    ) -> Inspeccion:
        """
        RN-11 / ADJ-02: Aprueba la inspección, valida precriterios, genera sello digital
        y calcula fecha de próxima revisión (+ 6 meses).
        """
        inspeccion = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not inspeccion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección seleccionada no existe."
            )

        # Verificar hallazgos pendientes
        hallazgos_pendientes = HallazgoRepository.get_pendientes_by_inspeccion(db, inspeccion.id)
        if not MaquinaEstadoInspeccion.puede_aprobar(inspeccion.estado, len(hallazgos_pendientes)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede aprobar la inspección. Debe estar en 'pendiente_aprobacion' y no tener hallazgos sin atender. Hallazgos pendientes: {len(hallazgos_pendientes)}."
            )

        # Transicionar estado a 'aprobado'
        nuevo_estado = MaquinaEstadoInspeccion.transicionar(inspeccion.estado, EventoInspeccion.APROBAR.value)
        inspeccion.estado = nuevo_estado
        inspeccion.fecha_aprobacion = datetime.now(timezone.utc)
        inspeccion.aprobado_por_id = jefe.id

        # Calcular fecha próxima revisión (+ 6 meses) (RN-13)
        inspeccion.fecha_proxima_revision = date.today() + timedelta(days=180)

        # Registrar firma del jefe (RN-10)
        FirmaTecnicoRepository.registrar_firma_aprobador(
            db=db,
            inspeccion_id=inspeccion.id,
            jefe_id=jefe.id,
            firma_url=data.firma_url
        )

        # Generar Sello Digital de Aprobación (RN-12 / ADJ-02)
        sello = GestorSelloAprobacion.generar_sello(
            numero_inspeccion=inspeccion.numero_inspeccion,
            fecha_creacion=inspeccion.fecha,
            fecha_aprobacion=inspeccion.fecha_aprobacion,
            nombre_jefe=jefe.nombre,
            firma_jefe_url=data.firma_url
        )
        inspeccion.sello_url = str(sello.to_dict())

        InspeccionRepository.save(db, inspeccion)

        # Notificar al técnico responsable
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
    def solicitar_segunda_revision(
        db: Session,
        jefe: Usuario,
        inspeccion_id: uuid.UUID,
        observaciones: Optional[str] = None
    ) -> Inspeccion:
        """
        RN-08 / D-01: Solicita una segunda revisión. Crea una NUEVA entidad Inspeccion
        referenciando a la inspección original (`inspeccion_previa_id`), incrementando
        el número de revisión a 2 y manteniendo la inspección original intacta como historial.
        """
        original = InspeccionRepository.get_by_id(db, inspeccion_id)
        if not original:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La inspección original no existe."
            )

        # Marcar la inspección original como 'segunda_revision_solicitada'
        nuevo_estado_original = MaquinaEstadoInspeccion.transicionar(
            original.estado,
            EventoInspeccion.SOLICITAR_SEGUNDA_REVISION.value
        )
        original.estado = nuevo_estado_original
        InspeccionRepository.save(db, original)

        # Crear la NUEVA inspección para la segunda revisión (con inspeccion_previa_id)
        nueva_revision = Inspeccion(
            numero_inspeccion=GeneradorNumeroInspeccion.obtener_siguiente_numero(db),
            numero_revision=original.numero_revision + 1,
            inspeccion_previa_id=original.id,
            vehiculo_id=original.vehiculo_id,
            empresa_contratista_id=original.empresa_contratista_id,
            creado_por_id=original.creado_por_id,
            fecha=datetime.now(timezone.utc),
            kilometraje=original.kilometraje,
            area_transitar=original.area_transitar,
            equipo_auxiliar=original.equipo_auxiliar,
            estado=EstadoInspeccion.EN_REVISION.value,
            resultado_general=DICTAMEN_CON_HALLAZGOS,
            observaciones=f"Segunda Revisión solicitada por {jefe.nombre}. Motivo: {observaciones or 'Atención de hallazgos previos'}"
        )
        db.add(nueva_revision)
        db.commit()
        db.refresh(nueva_revision)

        # Audit log
        AuditLogRepository.create_log(
            db=db,
            usuario_id=jefe.id,
            accion="segunda_revision",
            entidad="inspeccion",
            entidad_id=str(nueva_revision.id),
            ip="system",
            detalle={
                "inspeccion_original_id": str(original.id),
                "nueva_inspeccion_id": str(nueva_revision.id),
                "numero_revision": nueva_revision.numero_revision
            }
        )

        return InspeccionRepository.get_by_id(db, nueva_revision.id)

    @staticmethod
    def marcar_hallazgo_atendido(
        db: Session,
        usuario: Usuario,
        hallazgo_id: uuid.UUID
    ) -> Hallazgo:
        """
        RN-06: Marca un hallazgo como atendido. Si todos los hallazgos de esa inspección
        fueron atendidos, transiciona automáticamente el estado de la inspección a 'pendiente_aprobacion'.
        """
        hallazgo = HallazgoRepository.get_by_id(db, hallazgo_id)
        if not hallazgo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El hallazgo seleccionado no existe."
            )

        hallazgo = HallazgoRepository.marcar_atendido(db, hallazgo)
        
        # Verificar si quedan hallazgos pendientes en esta inspección
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
