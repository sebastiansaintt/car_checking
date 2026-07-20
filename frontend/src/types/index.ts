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
