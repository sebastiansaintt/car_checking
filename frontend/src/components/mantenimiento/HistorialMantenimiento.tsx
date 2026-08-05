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
        return <Badge variant="apto">Completado</Badge>;
      case 'en_progreso':
        return <Badge variant="revision">En progreso</Badge>;
      case 'vencido':
        return <Badge variant="no_apto">Vencido</Badge>;
      default:
        return <Badge variant="regular">Pendiente</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial · ${vehiculo.marca} ${vehiculo.modelo}`}
      description={vehiculo.patente}
    >
      <div className="space-y-4 text-xs">
        {/* Resumen del vehículo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-container">
          <div>
            <span className="text-[#6B7280] block text-[11px]">Kilometraje Actual</span>
            <span className="font-mono text-[#111827] font-semibold">{vehiculo.kilometraje_actual.toLocaleString('es-CO')} km</span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Último Mantenimiento</span>
            <span className="font-mono text-[#111827]">
              {vehiculo.fecha_ultimo_mantenimiento ? new Date(vehiculo.fecha_ultimo_mantenimiento).toLocaleDateString('es-CO') : 'Sin registros'}
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] block text-[11px]">Total Mantenimientos</span>
            <span className="font-semibold text-[#111827]">{misMantenimientos.length} órdenes</span>
          </div>
        </div>

        {/* Timeline de Mantenimientos */}
        {misMantenimientos.length === 0 ? (
          <div className="p-8 text-center text-[#9CA3AF]">
            No existen registros de mantenimiento para este vehículo.
          </div>
        ) : (
          <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
            {misMantenimientos.map((m) => (
              <div key={m.id} className="relative bg-white p-3 border border-[#E5E7EB] rounded-container space-y-2">
                {/* Indicador en la línea de tiempo */}
                <div className={`absolute -left-[21px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  m.estado === 'completado' ? 'bg-[#065F46]' :
                  m.estado === 'vencido' ? 'bg-[#991B1B]' :
                  m.estado === 'en_progreso' ? 'bg-[#1E40AF]' : 'bg-[#92400E]'
                }`} />

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold uppercase text-[#6B7280]">
                      {m.tipo}
                    </span>
                    <h5 className="font-semibold text-[#111827] text-xs">{m.descripcion}</h5>
                  </div>
                  {getStatusBadge(m.estado)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#6B7280] pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Límite: <strong className="text-[#111827] font-mono">{new Date(m.fecha_limite).toLocaleDateString('es-CO')}</strong></span>
                  </div>
                  {m.fecha_completado && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#065F46]" />
                      <span>Completado: <strong className="text-[#111827] font-mono">{new Date(m.fecha_completado).toLocaleDateString('es-CO')}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Km registro: <strong className="font-mono text-[#111827]">{m.kilometraje_al_crear.toLocaleString('es-CO')} km</strong></span>
                  </div>
                  {m.kilometraje_al_completar && (
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-[#065F46]" />
                      <span>Km cierre: <strong className="font-mono text-[#065F46]">{m.kilometraje_al_completar.toLocaleString('es-CO')} km</strong></span>
                    </div>
                  )}
                </div>

                {m.observaciones && (
                  <p className="p-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded text-[11px] text-[#6B7280] italic mt-1">
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
