import React from 'react';
import { Mantenimiento, Vehiculo } from '../../types';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Calendar, Gauge, CheckCircle2 } from 'lucide-react';

interface HistorialMantenimientoProps {
  isOpen: boolean;
  onClose: () => void;
  vehiculo: Vehiculo | null;
  mantenimientos: Mantenimiento[];
}

export const HistorialMantenimiento: React.FC<HistorialMantenimientoProps> = ({
  isOpen,
  onClose,
  vehiculo,
  mantenimientos
}) => {
  if (!vehiculo) return null;

  const misMantenimientos = mantenimientos.filter(m => m.vehiculo_id === vehiculo.id);

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'completado':
        return <Badge variant="apto">COMPLETADO</Badge>;
      case 'en_progreso':
        return <Badge variant="regular">EN PROGRESO</Badge>;
      case 'vencido':
        return <Badge variant="no_apto">VENCIDO</Badge>;
      default:
        return <Badge variant="regular">PENDIENTE</Badge>;
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Mantenimiento — ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})`}
    >
      <div className="space-y-4 text-xs">
        {/* Resumen del vehículo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-surface-subtle border border-border rounded-input">
          <div>
            <span className="text-secondary-text block text-[11px]">Kilometraje Actual</span>
            <span className="font-mono text-primary font-bold">{vehiculo.kilometraje_actual.toLocaleString('es-CL')} Km</span>
          </div>
          <div>
            <span className="text-secondary-text block text-[11px]">Último Mantenimiento</span>
            <span className="font-mono text-primary font-medium">
              {vehiculo.fecha_ultimo_mantenimiento ? new Date(vehiculo.fecha_ultimo_mantenimiento).toLocaleDateString('es-CL') : 'Sin registros'}
            </span>
          </div>
          <div>
            <span className="text-secondary-text block text-[11px]">Total Mantenimientos</span>
            <span className="font-bold text-brand">{misMantenimientos.length} órdenes</span>
          </div>
        </div>

        {/* Timeline de Mantenimientos */}
        {misMantenimientos.length === 0 ? (
          <div className="p-8 text-center text-secondary-text">
            No existen registros de mantenimiento para este vehículo.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {misMantenimientos.map((m) => (
              <div key={m.id} className="relative bg-white p-3.5 border border-border rounded-card space-y-2 shadow-xs">
                {/* Indicador en la línea de tiempo */}
                <div className={`absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  m.estado === 'completado' ? 'bg-emerald-500' :
                  m.estado === 'vencido' ? 'bg-red-500' :
                  m.estado === 'en_progreso' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      m.tipo === 'preventivo' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {m.tipo}
                    </span>
                    <h5 className="font-bold text-primary text-xs">{m.descripcion}</h5>
                  </div>
                  {getStatusBadge(m.estado)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-secondary-text pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-secondary-tertiary" />
                    <span>Límite: <strong className="text-primary">{new Date(m.fecha_limite).toLocaleDateString('es-CL')}</strong></span>
                  </div>
                  {m.fecha_completado && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Completado: <strong className="text-primary">{new Date(m.fecha_completado).toLocaleDateString('es-CL')}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-secondary-tertiary" />
                    <span>Km registro: <strong className="font-mono text-primary">{m.kilometraje_al_crear.toLocaleString('es-CL')} Km</strong></span>
                  </div>
                  {m.kilometraje_al_completar && (
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Km cierre: <strong className="font-mono text-emerald-700">{m.kilometraje_al_completar.toLocaleString('es-CL')} Km</strong></span>
                    </div>
                  )}
                </div>

                {m.observaciones && (
                  <p className="p-2 bg-surface-subtle border border-border rounded text-[11px] text-secondary-text italic mt-1">
                    "{m.observaciones}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
