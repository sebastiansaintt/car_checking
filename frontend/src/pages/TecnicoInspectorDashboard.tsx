import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion } from '../types';
import { apiFetch } from '../lib/api';
import { ChecklistForm } from '../components/inspeccion/ChecklistForm';
import { VehiculosTable } from '../components/vehiculo/VehiculosTable';
import { Button } from '../components/ui/Button';

import { ToastNotification } from '../components/ui/ToastNotification';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { MantenimientoPanel } from '../components/mantenimiento/MantenimientoPanel';
import {
  PlusCircle,
  ClipboardList,
  LogOut,
  Truck,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Wrench,
  RotateCw
} from 'lucide-react';

export const TecnicoInspectorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [sistemas, setSistemas] = useState<CatalogoSistema[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  
  const [activeTab, setActiveTab] = useState<'resumen' | 'nueva' | 'vehiculos' | 'historial' | 'mantenimiento'>('resumen');

  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Re-inspección / Edición en la misma planilla (RN-07)
  const [inspeccionToEdit, setInspeccionToEdit] = useState<Inspeccion | null>(null);

  // Hook de sincronización offline PWA
  const { isOnline, isSyncing, pendingCount } = useOfflineSync((syncedCount) => {
    setToast({
      message: `Sincronización PWA completada: ${syncedCount} inspección(es) subida(s) automáticamente.`,
      type: 'success'
    });
    loadData();
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, sData, cData, eData, iData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<CatalogoSistema[]>('/inspecciones/sistemas-catalog'),
        apiFetch<CatalogoItem[]>('/inspecciones/checklist-catalog'),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas'),
        apiFetch<Inspeccion[]>('/inspecciones')
      ]);
      setVehiculos(vData);
      setSistemas(sData);
      setCatalogo(cData);
      setEmpresas(eData);
      setInspecciones(iData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos operativos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSuccess = (inspeccionResult: Inspeccion) => {
    setInspeccionToEdit(null);
    setActiveTab('historial');
    setToast({
      message: inspeccionResult.numero_revision > 1
        ? `Re-inspección N° ${inspeccionResult.numero_inspeccion} corregida exitosamente (Revisión N° ${inspeccionResult.numero_revision}).`
        : `Inspección N° ${inspeccionResult.numero_inspeccion} creada exitosamente.`,
      type: 'success'
    });
    loadData();
  };

  const handleIniciarCorregir = (ins: Inspeccion) => {
    setInspeccionToEdit(ins);
    setActiveTab('nueva');
  };

  const misInspecciones = inspecciones.filter(i => i.creado_por_id === user?.id || (i as any).coordinador_id === user?.id);
  const totalAprobados = inspecciones.filter(i => i.resultado_general === 'aprobado' || i.resultado_general === 'apto').length;
  const totalConHallazgos = inspecciones.filter(i => i.resultado_general === 'con_hallazgos' || i.resultado_general === 'no_apto').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <ToastNotification
        message={toast?.message || null}
        type={toast?.type || 'success'}
        onClose={() => setToast(null)}
      />

      {/* Header Sointer Ltda. */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-black text-slate-900 dark:text-slate-100">SOINTER LTDA.</h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  Interventora
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Técnico Inspector: <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.nombre}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Banner PWA Offline */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-inner">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Modo Sin Conexión (PWA). Las inspecciones se guardarán en la cola IndexedDB
            {pendingCount > 0 && ` (${pendingCount} pendiente(s) por sincronizar)`}.
          </span>
        </div>
      )}

      {isOnline && isSyncing && (
        <div className="bg-indigo-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Sincronizando inspecciones offline con el servidor central de Sointer...</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 pb-3 -mx-4 px-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => { setInspeccionToEdit(null); setActiveTab('resumen'); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'resumen'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Resumen Operativo
            </button>
            <button
              onClick={() => { setInspeccionToEdit(null); setActiveTab('nueva'); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'nueva'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> {inspeccionToEdit ? 'Re-inspección en Curso' : 'Nueva Inspección'}
            </button>
            <button
              onClick={() => setActiveTab('vehiculos')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'vehiculos'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" /> Flota Registrada ({vehiculos.length})
            </button>
            <button
              onClick={() => setActiveTab('mantenimiento')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'mantenimiento'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-4 h-4" /> Hallazgos & Mantenimiento
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'historial'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Inspecciones ({inspecciones.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500">Cargando datos de la interventoría...</div>
        ) : activeTab === 'resumen' ? (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 shadow-xs">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                Panel Técnico Inspector · Sointer Ltda.
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                ¡Bienvenido, {user?.nombre}!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                Como empresa interventora contratista, su función es inspeccionar los vehículos que llegan de diferentes empresas contratistas externas, evaluar los 9 sistemas de la planilla FO-M4-P13-96 y dictaminar si el equipo queda **Aprobado** o **Con Hallazgos**.
              </p>
              <div className="pt-3 flex flex-wrap gap-3">
                <Button variant="primary" size="md" onClick={() => { setInspeccionToEdit(null); setActiveTab('nueva'); }}>
                  <PlusCircle className="w-4 h-4" /> Iniciar Nueva Inspección Técnica
                </Button>
                <Button variant="outline" size="md" onClick={() => setActiveTab('historial')}>
                  <ClipboardList className="w-4 h-4" /> Ver Historial & Re-inspeccionar
                </Button>
              </div>
            </div>

            {/* Tarjetas KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Mis Inspecciones Realizadas</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{misInspecciones.length}</h3>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                  <ClipboardList className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Vehículos Aprobados</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-1">{totalAprobados}</h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Con Hallazgos Subestándar</p>
                  <h3 className="text-3xl font-black text-rose-600 mt-1">{totalConHallazgos}</h3>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'nueva' ? (
          <ChecklistForm
            sistemas={sistemas}
            catalogo={catalogo}
            empresas={empresas}
            vehiculos={vehiculos}
            initialInspeccionToEdit={inspeccionToEdit}
            onSuccess={handleFormSuccess}
            onCancel={() => { setInspeccionToEdit(null); setActiveTab('resumen'); }}
          />
        ) : activeTab === 'vehiculos' ? (
          <VehiculosTable vehiculos={vehiculos} />
        ) : activeTab === 'mantenimiento' ? (
          <MantenimientoPanel vehiculos={vehiculos} role="coordinador" />
        ) : (
          /* TABLA DE HISTORIAL CON BOTÓN DE RE-INSPECCIÓN / CORRECCIÓN */
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            {inspecciones.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 space-y-3">
                <p>No se han registrado inspecciones aún.</p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('nueva')}>
                  <PlusCircle className="w-4 h-4" /> Registrar Primera Inspección
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Planilla / Rev.</th>
                      <th className="py-3.5 px-4">Fecha / Hora</th>
                      <th className="py-3.5 px-4">Vehículo (Placa)</th>
                      <th className="py-3.5 px-4">Empresa Contratista</th>
                      <th className="py-3.5 px-4">Dictamen General</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
                    {inspecciones.map((ins) => {
                      const esConHallazgos = ins.resultado_general === 'con_hallazgos' || ins.estado === 'con_hallazgos';

                      return (
                        <tr key={ins.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            N° {ins.numero_inspeccion || '4800'} <span className="text-slate-400 font-normal">(Rev. {ins.numero_revision || 1})</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                            {new Date(ins.fecha).toLocaleDateString('es-CO')} {ins.hora_inspeccion && `· ${ins.hora_inspeccion}`}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                            {ins.vehiculo_patente || ins.vehiculo_id}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {ins.empresa_contratista_nombre || 'Contratista Externa'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              esConHallazgos ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {esConHallazgos ? '🔴 CON HALLAZGOS' : '🟢 APROBADO'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 capitalize font-mono text-[11px]">
                            {ins.estado.replace('_', ' ')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {esConHallazgos ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleIniciarCorregir(ins)}
                                className="bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                <RotateCw className="w-3.5 h-3.5" /> Re-inspeccionar / Corregir Planilla
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400 font-normal">Planilla lista</span>
                            )}
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

// Alias de Re-exportación para mantener compatibilidad de rutas
export const CoordinadorDashboard = TecnicoInspectorDashboard;
