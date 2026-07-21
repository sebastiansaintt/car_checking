export interface AuditLogItem {
  id: string;
  usuario_id?: string;
  accion: 'login' | 'logout' | 'crear' | 'editar' | 'eliminar' | 'exportar';
  entidad: string;
  entidad_id?: string;
  ip?: string;
  detalle?: any;
  timestamp: string;
}
