export type Role = 'coordinador' | 'gerente';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  activo: boolean;
  created_at: string;
}

export interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  año: number;
  kilometraje_actual: number;
  estado: string;
  imagen_url?: string;
  fecha_ultimo_mantenimiento?: string;
  fecha_proximo_mantenimiento?: string;
}

export interface CatalogoItem {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface ChecklistItem {
  id?: string;
  catalogo_id: string;
  valor: 'bueno' | 'regular' | 'malo';
  catalogo_nombre?: string;
}

export interface Evidencia {
  id?: string;
  url: string;
  checklist_item_id?: string;
  descripcion?: string;
}

export interface Inspeccion {
  id: string;
  vehiculo_id: string;
  coordinador_id: string;
  fecha: string;
  kilometraje: number;
  resultado_general: 'apto' | 'no_apto';
  mantenimiento_recomendado?: string;
  firma_url: string;
  observaciones?: string;
  checklist_items: ChecklistItem[];
  evidencias: Evidencia[];
  created_at: string;
}

export interface Mantenimiento {
  id: string;
  vehiculo_id: string;
  coordinador_id: string;
  inspeccion_origen_id?: string;
  tipo: 'preventivo' | 'correctivo';
  descripcion: string;
  fecha_limite: string;
  fecha_completado?: string;
  kilometraje_al_crear: number;
  kilometraje_al_completar?: number;
  estado: 'pendiente' | 'en_progreso' | 'completado' | 'vencido';
  observaciones?: string;
  vehiculo_patente?: string;
  vehiculo_modelo?: string;
  coordinador_nombre?: string;
  created_at: string;
  updated_at?: string;
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

