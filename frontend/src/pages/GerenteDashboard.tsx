import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, Inspeccion } from '../types';
import { apiFetch } from '../lib/api';
import { VehiculosTable } from '../components/vehiculo/VehiculosTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ToastNotification } from '../components/ui/ToastNotification';
import { Download, Filter, LogOut, Truck, CheckCircle2, XCircle, Search, RefreshCw, Eye, ClipboardList } from 'lucide-react';

export const GerenteDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [activeTab, setActiveTab] = useState<'inspecciones' | 'vehiculos'>('inspecciones');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtros
  const [filterVehiculoId, setFilterVehiculoId] = useState<string>('');
  const [filterResultado, setFilterResultado] = useState<string>('');

  // Modal de Detalle
  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let endpoint = '/inspecciones?limit=100';
      const params = new URLSearchParams();
      if (filterVehiculoId) params.append('vehiculo_id', filterVehiculoId);
      if (filterResultado) params.append('resultado_general', filterResultado);

      if (params.toString()) {
        endpoint += `&${params.toString()}`;
      }

      const [vData, iData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<Inspeccion[]>(endpoint)
      ]);
      setVehiculos(vData);
      setInspecciones(iData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setToastMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterVehiculoId, filterResultado]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let endpoint = '/export/inspecciones?';
      const params = new URLSearchParams();
      if (filterVehiculoId) params.append('vehiculo_id', filterVehiculoId);
      if (filterResultado) params.append('resultado_general', filterResultado);

      const blob = await apiFetch<Blob>(`${endpoint}${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_inspecciones_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar a Excel';
      setToastMessage(msg);
    } finally {
      setExporting(false);
    }
  };

  // Métricas rápidas
  const totalInspecciones = inspecciones.length;
  const totalAptos = inspecciones.filter(i => i.resultado_general === 'apto').length;
  const totalNoAptos = inspecciones.filter(i => i.resultado_general === 'no_apto').length;

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle">
      {/* Toast Flotante Centrado */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand text-white rounded-container flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary">Inspección de Flota</h1>
              <p className="text-xs text-secondary-text">Gerente (Lectura + Auditoría) — {user?.nombre}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('inspecciones')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 ${
                activeTab === 'inspecciones'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Inspecciones ({inspecciones.length})
            </button>
            <button
              onClick={() => setActiveTab('vehiculos')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 ${
                activeTab === 'vehiculos'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> Catálogo Vehículos ({vehiculos.length})
            </button>
          </div>
        </div>

        {/* KPI Cards Sobrias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary-text">Inspecciones Listadas</p>
              <h3 className="text-2xl font-bold text-primary mt-1">{totalInspecciones}</h3>
            </div>
            <div className="p-2.5 bg-gray-100 rounded-container text-secondary-text">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary-text">Vehículos Aptos</p>
              <h3 className="text-2xl font-bold text-status-apto-text mt-1">{totalAptos}</h3>
            </div>
            <div className="p-2.5 bg-status-apto-bg text-status-apto-text rounded-container">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-secondary-text">Vehículos No Aptos</p>
              <h3 className="text-2xl font-bold text-status-no_apto-text mt-1">{totalNoAptos}</h3>
            </div>
            <div className="p-2.5 bg-status-no_apto-bg text-status-no_apto-text rounded-container">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {activeTab === 'vehiculos' ? (
          <VehiculosTable vehiculos={vehiculos} />
        ) : (
          <>
            {/* Barra de Filtros y Exportación */}
            <div className="bg-white p-4 border border-border rounded-card space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Filter className="w-4 h-4 text-secondary-text" /> Filtros de Búsqueda
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleExportExcel} isLoading={exporting}>
                    <Download className="w-3.5 h-3.5" /> Exportar a Excel (.xlsx)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <Select
                  label="Filtrar por Vehículo"
                  value={filterVehiculoId}
                  onChange={(e) => setFilterVehiculoId(e.target.value)}
                  options={[
                    { value: '', label: 'Todos los vehículos (12)' },
                    ...vehiculos.map(v => ({ value: v.id, label: `${v.patente} — ${v.marca} ${v.modelo}` }))
                  ]}
                />
                <Select
                  label="Filtrar por Resultado"
                  value={filterResultado}
                  onChange={(e) => setFilterResultado(e.target.value)}
                  options={[
                    { value: '', label: 'Todos los resultados' },
                    { value: 'apto', label: 'APTO únicamente' },
                    { value: 'no_apto', label: 'NO APTO únicamente' }
                  ]}
                />
              </div>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-white border border-border rounded-card overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm text-secondary-tertiary">Cargando inspecciones...</div>
              ) : inspecciones.length === 0 ? (
                <div className="p-12 text-center text-sm text-secondary-text">
                  No se encontraron inspecciones con los filtros aplicados.
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
                        <th className="py-3 px-4">Mantenimiento Recomendado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
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
                              {ins.mantenimiento_recomendado || 'Ninguno'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button variant="outline" size="sm" onClick={() => setSelectedInspeccion(ins)}>
                                <Eye className="w-3.5 h-3.5" /> Detalle
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal de Detalle Completo */}
      <Modal
        isOpen={!!selectedInspeccion}
        onClose={() => setSelectedInspeccion(null)}
        title="Detalle de Reporte de Inspección"
      >
        {selectedInspeccion && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-3 bg-surface-subtle border border-border rounded-input">
              <div>
                <span className="text-secondary-text block">ID de Registro</span>
                <span className="font-mono text-primary font-semibold">{selectedInspeccion.id}</span>
              </div>
              <div>
                <span className="text-secondary-text block">Fecha de Inspección</span>
                <span className="font-mono text-primary">{new Date(selectedInspeccion.fecha).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-secondary-text block">Resultado General</span>
                <Badge variant={selectedInspeccion.resultado_general === 'apto' ? 'apto' : 'no_apto'}>
                  {selectedInspeccion.resultado_general.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-secondary-text block">Kilometraje Registrado</span>
                <span className="font-mono">{selectedInspeccion.kilometraje.toLocaleString()} Km</span>
              </div>
            </div>

            {/* Checklist items */}
            <div>
              <h5 className="font-semibold text-primary mb-2">Checklist de Evaluación</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedInspeccion.checklist_items.map((item, idx) => (
                  <div key={idx} className="p-2 border border-border rounded-input bg-white flex items-center justify-between">
                    <span className="capitalize text-secondary-text">{item.catalogo_nombre || 'Item'}</span>
                    <Badge variant={item.valor}>{item.valor.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Observaciones y Mantenimiento */}
            {selectedInspeccion.observaciones && (
              <div>
                <h5 className="font-semibold text-primary mb-1">Observaciones</h5>
                <p className="p-2.5 bg-gray-50 border border-border rounded-input text-secondary-text">
                  {selectedInspeccion.observaciones}
                </p>
              </div>
            )}

            {/* Firma */}
            <div>
              <h5 className="font-semibold text-primary mb-1">Firma Digital del Coordinador</h5>
              <div className="border border-border rounded-input p-2 bg-white inline-block">
                <img src={selectedInspeccion.firma_url} alt="Firma" className="h-20 object-contain" />
              </div>
            </div>

            {/* Evidencias fotográficas */}
            {selectedInspeccion.evidencias.length > 0 && (
              <div>
                <h5 className="font-semibold text-primary mb-2">Evidencias Fotográficas</h5>
                <div className="grid grid-cols-2 gap-2">
                  {selectedInspeccion.evidencias.map((ev, idx) => (
                    <div key={idx} className="border border-border rounded-input overflow-hidden">
                      <img src={ev.url} alt="Evidencia" className="w-full h-32 object-cover" />
                      {ev.descripcion && <p className="p-1.5 text-[11px] text-secondary-text">{ev.descripcion}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
