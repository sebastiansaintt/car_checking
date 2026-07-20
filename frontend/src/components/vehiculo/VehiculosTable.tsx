import React from 'react';
import { Vehiculo } from '../../types';
import { Badge } from '../ui/Badge';
import { Truck } from 'lucide-react';

interface VehiculosTableProps {
  vehiculos: Vehiculo[];
}

// Map de imágenes realistas por modelo para la vista de miniatura
const VEHICLE_THUMBNAILS: Record<string, string> = {
  Amarok: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&auto=format&fit=crop&q=80',
  Hilux: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=200&auto=format&fit=crop&q=80',
  'BT-50': 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200&auto=format&fit=crop&q=80',
  Oroch: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
  Tundra: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=200&auto=format&fit=crop&q=80',
  Frontier: 'https://images.unsplash.com/photo-1609521263047-f8d205293f24?w=200&auto=format&fit=crop&q=80',
  L200: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&auto=format&fit=crop&q=80',
  Navara: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=200&auto=format&fit=crop&q=80',
  Ranger: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=200&auto=format&fit=crop&q=80',
};

export const VehiculosTable: React.FC<VehiculosTableProps> = ({ vehiculos }) => {
  return (
    <div className="bg-white border border-border rounded-card overflow-hidden shadow-xs">
      <div className="p-4 border-b border-border bg-surface-subtle flex items-center justify-between">
        <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
          <Truck className="w-4 h-4 text-secondary-text" /> Catálogo de Flota Vehicular ({vehiculos.length})
        </h3>
        <span className="text-[11px] text-secondary-text">12 camionetas asignadas al proyecto</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-border text-secondary-text font-medium">
            <tr>
              <th className="py-3 px-4">Miniatura</th>
              <th className="py-3 px-4">Patente</th>
              <th className="py-3 px-4">Marca y Modelo</th>
              <th className="py-3 px-4">Año</th>
              <th className="py-3 px-4">Kilometraje Actual</th>
              <th className="py-3 px-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vehiculos.map((v) => {
              const thumbUrl = VEHICLE_THUMBNAILS[v.modelo] || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&auto=format&fit=crop&q=80';
              return (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="w-14 h-10 border border-border rounded-input overflow-hidden bg-gray-100 shrink-0">
                      <img src={thumbUrl} alt={v.modelo} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-primary">{v.patente}</td>
                  <td className="py-2.5 px-4 font-medium text-primary">
                    {v.marca} {v.modelo}
                  </td>
                  <td className="py-2.5 px-4 text-secondary-text">{v.año}</td>
                  <td className="py-2.5 px-4 font-mono">{v.kilometraje_actual.toLocaleString('es-CL')} Km</td>
                  <td className="py-2.5 px-4">
                    <Badge variant={v.estado === 'activo' ? 'apto' : 'neutral'}>
                      {v.estado.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
