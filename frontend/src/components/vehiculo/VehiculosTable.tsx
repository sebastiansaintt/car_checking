import React from 'react';
import { Vehiculo } from '../../types';
import { Badge } from '../ui/Badge';
import { Truck } from 'lucide-react';

interface VehiculosTableProps {
  vehiculos: Vehiculo[];
}

// Map de imágenes realistas por modelo para la vista de miniatura
const VEHICLE_THUMBNAILS: Record<string, string> = {
  Amarok: 'https://www.elcarrocolombiano.com/wp-content/uploads/2020/11/20201102-VOLKSWAGEN-AMAROK-2021-01-01-750x518.jpg',
  Hilux: 'https://sp-accesorios.com/cdn/shop/collections/TOYOTA_d6a3a338-b9d3-41c1-80cd-b2b727d617cd.jpg?v=1710253402&width=1296',
  'BT-50': 'https://panzer.com.co/wp-content/uploads/2024/09/realces-Mazda-bt50.webp',
  Oroch: 'https://acroadtrip.blob.core.windows.net/catalogo-imagenes/xl/RT_V_88b960a46e3f4b4888b7d053ba462e05.jpg',
  Tundra: 'https://images.hgmsites.net/lrg/2023-toyota-tundra-limited-crewmax-5-5-bed-3-5l-natl-angular-front-exterior-view_100870823_l.jpg',
  Frontier: 'https://images.hgmsites.net/lrg/2024-nissan-frontier-crew-cab-4x2-pro-x-angular-front-exterior-view_100907162_l.webp',
  L200: 'https://acnews.blob.core.windows.net/imgnews/paragraph/NPAZ_9196cf69e00f43bc87c1c4d6d3a35d09.jpg',
  Navara: 'https://nissan.com.my/v2/wp-content/uploads/2025/04/nav-slide-v2_4-3.png',
  Ranger: 'https://acnews.blob.core.windows.net/imgnews/paragraph/NPAZ_9196cf69e00f43bc87c1c4d6d3a35d09.jpg',
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
