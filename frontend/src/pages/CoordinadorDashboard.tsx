import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, CatalogoItem, Inspeccion } from '../types';
import { apiFetch } from '../lib/api';
import { ChecklistForm } from '../components/inspeccion/ChecklistForm';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PlusCircle, ClipboardList, LogOut, Truck } from 'lucide-react';

export const CoordinadorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [activeTab, setActiveTab] = useState<'lista' | 'nueva'>('lista');
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, cData, iData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<CatalogoItem[]>('/inspecciones/checklist-catalog'),
        apiFetch<Inspeccion[]>('/inspecciones')
      ]);
      setVehiculos(vData);
      setCatalogo(cData);
      setInspecciones(iData);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSuccess = (nueva: Inspeccion) => {
    setInspecciones(prev => [nueva, ...prev]);
    setActiveTab('lista');
    loadData(); // Recargar vehículos para tener el kilometraje actualizado
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-white rounded-container flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary">Inspección de Flota</h1>
              <p className="text-xs text-secondary-text">Panel del Coordinador — {user?.nombre}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Subheader / Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('lista')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 ${
                activeTab === 'lista'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Historial ({inspecciones.length})
            </button>
            <button
              onClick={() => setActiveTab('nueva')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 ${
                activeTab === 'nueva'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Nueva Inspección
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-secondary-tertiary">Cargando datos de la flota...</div>
        ) : activeTab === 'nueva' ? (
          <ChecklistForm vehiculos={vehiculos} catalogo={catalogo} onSuccess={handleFormSuccess} />
        ) : (
          <div className="bg-white border border-border rounded-card overflow-hidden">
            {inspecciones.length === 0 ? (
              <div className="p-12 text-center text-sm text-secondary-text space-y-3">
                <p>No se han registrado inspecciones aún.</p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('nueva')}>
                  <PlusCircle className="w-4 h-4" /> Registrar Primera Inspección
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border text-secondary-text font-medium">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Vehículo</th>
                      <th className="py-3 px-4">Kilometraje</th>
                      <th className="py-3 px-4">Resultado</th>
                      <th className="py-3 px-4">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {inspecciones.map((ins) => {
                      const veh = vehiculos.find(v => v.id === ins.vehiculo_id);
                      return (
                        <tr key={ins.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-mono text-secondary-text">
                            {new Date(ins.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 font-medium text-primary">
                            {veh ? `${veh.marca} ${veh.modelo} (${veh.patente})` : ins.vehiculo_id}
                          </td>
                          <td className="py-3 px-4 font-mono">{ins.kilometraje.toLocaleString('es-CL')} Km</td>
                          <td className="py-3 px-4">
                            <Badge variant={ins.resultado_general === 'apto' ? 'apto' : 'no_apto'}>
                              {ins.resultado_general === 'apto' ? 'APTO' : 'NO APTO'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-secondary-text truncate max-w-xs">
                            {ins.observaciones || 'Sin observaciones'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
