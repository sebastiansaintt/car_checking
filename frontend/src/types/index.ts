export type Role = 'tecnico_inspector' | 'ingeniero' | 'programador' | 'administrador' | 'coordinador' | 'gerente' | 'jefe_inspeccion';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  cargo?: string;
  firma_url?: string;
  activo: boolean;
  created_at: string;
}

export interface EmpresaContratista {
  id: string;
  nombre: string;
  rut?: string;
  contacto?: string;
  activo: boolean;
  created_at: string;
}

export interface Vehiculo {
  id: string;
  patente: string;
  empresa_contratista_id?: string;
  empresa_contratista_nombre?: string;
  marca: string;
  modelo: string;
  año: number;
  tipo_vehiculo?: string;
  numero_interno?: string;
  color?: string;
  equipo_auxiliar?: string;
  area_transitar?: string;
  kilometraje_actual: number;
  estado: string;
  imagen_url?: string;
  fecha_ultimo_mantenimiento?: string;
  fecha_proximo_mantenimiento?: string;
}

export interface VehiculoInspeccionado {
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  kilometraje: number;
  total_inspecciones: number;
  ultima_fecha: string;
  nombre_tecnico_ultimo?: string;
  equipo_auxiliar?: string;
  numero_interno?: string;
}

export interface CatalogoSistema {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface CatalogoItem {
  id: string;
  sistema_id?: string;
  codigo_item?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface EvaluacionSistema {
  id?: string;
  sistema_id: string;
  estado_sistema: 'aprobado' | 'no_aprobado' | 'na';
  sistema_nombre?: string;
  sistema_codigo?: string;
  sistema?: CatalogoSistema;
}

export interface ChecklistItem {
  id?: string;
  catalogo_id: string;
  valor: 'estandar' | 'subestandar' | 'na' | 'bueno' | 'regular' | 'malo';
  comentario?: string;
  catalogo_nombre?: string;
}

export interface Hallazgo {
  id: string;
  inspeccion_id: string;
  item_checklist_id?: string;
  descripcion: string;
  atendido: boolean;
  fecha_atencion?: string;
  created_at: string;
}

export interface FirmaTecnico {
  id?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  nombre_adicional?: string;
  firma_url?: string;
  es_aprobador: boolean;
  signed_at?: string;
  usuario?: User;
}

export interface SelloAprobacionData {
  empresa_nombre: string;
  empresa_nit: string;
  numero_inspeccion: number;
  fecha_creacion: string;
  fecha_aprobacion: string;
  aprobado_por: string;
  firma_jefe_url: string;
  leyenda: string;
}

export interface Inspeccion {
  id: string;
  numero_inspeccion: number;
  numero_revision: number;
  inspeccion_previa_id?: string;
  inspeccion_primaria_id?: string;
  motivo_actualizacion?: 'correccion_hallazgos' | 'error_registro' | 'reinspeccion_programada' | string;
  fecha_actualizacion?: string;
  es_subregistro?: boolean;

  vehiculo_id: string;
  vehiculo_patente?: string;
  vehiculo_modelo?: string;
  vehiculo?: Vehiculo;
  empresa_contratista_id?: string;
  empresa_contratista_nombre?: string;
  empresa_contratista?: EmpresaContratista;
  creado_por_id: string;
  creado_por_nombre?: string;

  fecha: string;
  hora_inspeccion?: string;
  kilometraje: number;
  area_transitar?: string;
  equipo_auxiliar?: string;

  estado: 'en_revision' | 'con_hallazgos' | 'pendiente_aprobacion' | 'aprobado';
  resultado_general: 'aprobado' | 'con_hallazgos' | 'apto' | 'no_apto';
  mantenimiento_recomendado?: string;
  firma_url?: string;
  observaciones?: string;

  fecha_aprobacion?: string;
  aprobado_por_id?: string;
  aprobado_por_nombre?: string;
  fecha_proxima_revision?: string;
  sello_url?: string;

  evaluaciones_sistema?: EvaluacionSistema[];
  checklist_items: ChecklistItem[];
  hallazgos?: Hallazgo[];
  firmas_tecnicos?: FirmaTecnico[];
  created_at: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  referencia_id?: string;
  referencia_tipo?: string;
  leida: boolean;
  created_at: string;
}

export interface KpiResumen {
  total_vehiculos: number;
  total_inspecciones: number;
  inspecciones_apto: number;
  inspecciones_no_apto: number;
  tasa_aptitud: number;
  mantenimientos_pendientes: number;
  mantenimientos_vencidos: number;
}
