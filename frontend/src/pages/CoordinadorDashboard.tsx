import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, CatalogoItem, Inspeccion } from '../types';
import { apiFetch } from '../lib/api';
import { ChecklistForm } from '../components/inspeccion/ChecklistForm';
import { VehiculosTable } from '../components/vehiculo/VehiculosTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ToastNotification } from '../components/ui/ToastNotification';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { PlusCircle, ClipboardList, LogOut, Truck, CheckCircle2, AlertTriangle, Edit3, ArrowRight, WifiOff, RefreshCw } from 'lucide-react';

export const CoordinadorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'nueva' | 'vehiculos' | 'historial'>('resumen');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado para modal de edicion
  const [editingInspeccion, setEditingInspeccion] = useState<Inspeccion | null>(null);
  const [editObservaciones, setEditObservaciones] = useState<string>('');
  const [editMantenimiento, setEditMantenimiento] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Hook de sincronización offline PWA
  const { isOnline, isSyncing, pendingCount } = useOfflineSync((syncedCount) => {
    setToastMessage(`Sincronización completada: ${syncedCount} inspección(es) subida(s) automáticamente.`);
    loadData();
  });

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos de la flota';
      setToastMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSuccess = (nueva: Inspeccion) => {
    setInspecciones(prev => [nueva, ...prev]);
    setActiveTab('historial');
    setToastMessage('Inspección registrada con éxito.');
    loadData();
  };

  const handleOpenEdit = (ins: Inspeccion) => {
    setEditingInspeccion(ins);
    setEditObservaciones(ins.observaciones || '');
    setEditMantenimiento(ins.mantenimiento_recomendado || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspeccion) return;

    setIsUpdating(true);
    try {
      const updated = await apiFetch<Inspeccion>(`/inspecciones/${editingInspeccion.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          observaciones: editObservaciones,
          mantenimiento_recomendado: editMantenimiento
        })
      });

      setInspecciones(prev => prev.map(i => i.id === updated.id ? updated : i));
      setEditingInspeccion(null);
      setToastMessage('Reporte modificado con éxito. Se ha notificado al gerente vía correo.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar la inspección';
      setToastMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const misInspecciones = inspecciones.filter(i => i.coordinador_id === user?.id);
  const totalAptos = inspecciones.filter(i => i.resultado_general === 'apto').length;
  const totalNoAptos = inspecciones.filter(i => i.resultado_general === 'no_apto').length;

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle">
      {/* Toast Flotante Centrado con alto z-index */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary text-white rounded-container flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary">Inspección de Flota</h1>
              <p className="text-xs text-secondary-text">Coordinador: {user?.nombre}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </Button>
        </div>
      </header>

      {/* Banner de Estado Offline / Sincronización PWA */}
      {!isOnline && (
        <div className="bg-status-warning-bg border-b border-status-warning-border px-4 py-2 text-center text-xs font-semibold text-status-warning-text flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Modo Sin Conexión (Offline). Las inspecciones se guardarán en la cola local de IndexedDB
            {pendingCount > 0 && ` (${pendingCount} pendiente(s) por sincronizar)`}.
          </span>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-center text-xs font-semibold text-brand flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Sincronizando inspecciones guardadas offline con la base de datos central...</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors ${
                activeTab === 'resumen'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              Resumen Inicial
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
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 ${
                activeTab === 'historial'
                  ? 'bg-primary text-white'
                  : 'bg-white text-secondary-text border border-border hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Historial ({inspecciones.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-secondary-tertiary">Cargando datos de la flota...</div>
        ) : activeTab === 'resumen' ? (
          /* VISTA RESUMEN PRELIMINAR POST-LOGIN */
          <div className="space-y-6">
            <div className="bg-white p-6 border border-border rounded-card space-y-3 shadow-xs">
              <h2 className="text-lg font-bold text-primary">¡Bienvenido al Panel de Inspección, {user?.nombre}!</h2>
              <p className="text-xs text-secondary-text max-w-2xl leading-relaxed">
                Desde este panel puede registrar inspecciones físicas de la flota vehicular en terreno, consultar los datos de los 12 vehículos asignados y editar reportes previos.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Button variant="primary" size="md" onClick={() => setActiveTab('nueva')}>
                  <PlusCircle className="w-4 h-4" /> Registrar Nueva Inspección
                </Button>
                <Button variant="outline" size="md" onClick={() => setActiveTab('vehiculos')}>
                  <Truck className="w-4 h-4" /> Ver Flota de Vehículos
                </Button>
              </div>
            </div>

            {/* Tarjetas Informativas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary-text font-medium">Mis Registros</p>
                  <h3 className="text-2xl font-bold text-primary mt-1">{misInspecciones.length}</h3>
                </div>
                <div className="p-2.5 bg-gray-100 rounded-container text-secondary-text">
                  <ClipboardList className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary-text font-medium">Vehículos Aptos</p>
                  <h3 className="text-2xl font-bold text-status-apto-text mt-1">{totalAptos}</h3>
                </div>
                <div className="p-2.5 bg-status-apto-bg text-status-apto-text rounded-container">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 border border-border rounded-card flex items-center justify-between">
                <div>
                  <p className="text-xs text-secondary-text font-medium">Vehículos No Aptos</p>
                  <h3 className="text-2xl font-bold text-status-no_apto-text mt-1">{totalNoAptos}</h3>
                </div>
                <div className="p-2.5 bg-status-no_apto-bg text-status-no_apto-text rounded-container">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="bg-white p-5 border border-border rounded-card space-y-4">
              <h3 className="text-xs font-semibold text-primary border-b border-border pb-2">Acciones Frecuentes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => setActiveTab('nueva')}
                  className="p-4 border border-border rounded-input hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-primary group-hover:text-brand transition-colors">Crear Inspección Técnica</h4>
                    <p className="text-xs text-secondary-text">Completar la pauta de 14 ítems y adjuntar firma/evidencia</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-secondary-tertiary group-hover:text-brand transition-colors" />
                </div>

                <div
                  onClick={() => setActiveTab('historial')}
                  className="p-4 border border-border rounded-input hover:border-primary/40 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-primary group-hover:text-brand transition-colors">Revisar Historial y Editar</h4>
                    <p className="text-xs text-secondary-text">Modificar observaciones de inspecciones recientes</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-secondary-tertiary group-hover:text-brand transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'nueva' ? (
          <ChecklistForm vehiculos={vehiculos} catalogo={catalogo} onSuccess={handleFormSuccess} />
        ) : activeTab === 'vehiculos' ? (
          /* TABLA DE VEHÍCULOS CON MINIATURA */
          <VehiculosTable vehiculos={vehiculos} />
        ) : (
          /* TABLA DE HISTORIAL CON BOTÓN DE EDICIÓN */
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
                            {ins.observaciones || 'Sin observaciones'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(ins)}>
                              <Edit3 className="w-3.5 h-3.5" /> Editar
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
        )}
      </main>

      {/* Modal de Edición para el Coordinador */}
      <Modal
        isOpen={!!editingInspeccion}
        onClose={() => setEditingInspeccion(null)}
        title="Editar Reporte de Inspección"
      >
        {editingInspeccion && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="p-3 bg-surface-subtle border border-border rounded-input flex items-center justify-between">
              <div>
                <span className="text-secondary-text block">ID Registro</span>
                <span className="font-mono text-primary font-semibold">{editingInspeccion.id}</span>
              </div>
              <Badge variant={editingInspeccion.resultado_general === 'apto' ? 'apto' : 'no_apto'}>
                {editingInspeccion.resultado_general.toUpperCase()}
              </Badge>
            </div>

            <Input
              label="Mantenimiento Recomendado"
              value={editMantenimiento}
              onChange={(e) => setEditMantenimiento(e.target.value)}
              placeholder="Ej: Cambio preventivo de neumáticos..."
            />

            <div>
              <label className="text-xs font-medium text-primary block mb-1">Observaciones</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                value={editObservaciones}
                onChange={(e) => setEditObservaciones(e.target.value)}
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingInspeccion(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isUpdating}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
