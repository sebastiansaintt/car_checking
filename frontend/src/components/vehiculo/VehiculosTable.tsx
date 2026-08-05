import React from 'react';
import { Vehiculo } from '../../types';
import { Badge } from '../ui/Badge';

interface VehiculosTableProps {
  vehiculos: Vehiculo[];
}

export const VehiculosTable: React.FC<VehiculosTableProps> = ({ vehiculos }) => {
  return (
    <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-industrial">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Marca / Modelo</th>
              <th>Año</th>
              <th>Tipo</th>
              <th>Kilometraje</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#9CA3AF] text-sm">
                  No hay vehículos registrados.
                </td>
              </tr>
            ) : (
              vehiculos.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono font-semibold text-[#111827]">{v.patente}</td>
                  <td className="font-medium text-[#111827]">
                    {v.marca} {v.modelo}
                  </td>
                  <td className="text-[#6B7280]">{v.año}</td>
                  <td className="text-xs text-[#6B7280]">{v.tipo_vehiculo || '—'}</td>
                  <td className="font-mono text-[#111827]">{v.kilometraje_actual.toLocaleString('es-CL')} km</td>
                  <td>
                    <Badge variant={v.estado === 'activo' ? 'apto' : 'neutral'}>
                      {v.estado}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
