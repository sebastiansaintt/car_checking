import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion, VehiculoInspeccionado } from '../types';
import { apiFetch } from '../lib/api';
import { ChecklistForm } from '../components/inspeccion/ChecklistForm';
import { HistorialConArbol } from '../components/inspeccion/HistorialConArbol';
import { InspeccionDetailModal } from '../components/inspeccion/InspeccionDetailModal';
import { ActualizacionModal } from '../components/inspeccion/ActualizacionModal';
import { Button } from '../components/ui/Button';
import { ToastNotification } from '../components/ui/ToastNotification';
import { AppShell } from '../components/ui/AppShell';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { formatFechaColombia } from '../lib/dateUtils';
import {
  PlusCircle,
  ClipboardList,
  Truck,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

type Tab = 'resumen' | 'nueva' | 'vehiculos' | 'historial';

export const TecnicoInspectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculosInspeccionados, setVehiculosInspeccionados] = useState<VehiculoInspeccionado[]>([]);
  const [sistemas, setSistemas] = useState<CatalogoSistema[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modales
  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showActualizacionModal, setShowActualizacionModal] = useState<boolean>(false);
  const [inspeccionToEdit, setInspeccionToEdit] = useState<Inspeccion | null>(null);

  const { isOnline, isSyncing, pendingCount } = useOfflineSync((syncedCount) => {
    setToast({ message: `Sincronización completada: ${syncedCount} inspección(es) subida(s).`, type: 'success' });
    loadData();
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, viData, sData, cData, eData, iData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<VehiculoInspeccionado[]>('/inspecciones/vehiculos-inspeccionados'),
        apiFetch<CatalogoSistema[]>('/inspecciones/sistemas-catalog'),
        apiFetch<CatalogoItem[]>('/inspecciones/checklist-catalog'),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas'),
        apiFetch<Inspeccion[]>('/inspecciones'),
      ]);
      setVehiculos(vData);
      setVehiculosInspeccionados(viData);
      setSistemas(sData);
      setCatalogo(cData);
      setEmpresas(eData);
      setInspecciones(iData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFormSuccess = (result: Inspeccion) => {
    setInspeccionToEdit(null);
    setSelectedInspeccion(result);
    setShowDetailModal(true);
    setToast({
      message: result.numero_revision > 1
        ? `Subregistro N° ${result.numero_revision} creado para la planilla N° ${result.numero_inspeccion}.`
        : `Inspección N° ${result.numero_inspeccion} creada con éxito.`,
      type: 'success',
    });
    loadData();
  };

  const handleVerInspeccion = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setShowDetailModal(true);
  };

  const handleIniciarEditar = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setShowActualizacionModal(true);
  };

  const handleConfirmActualizacionModal = (motivo: string, fechaActualizacion: string) => {
    if (selectedInspeccion) {
      const copy = { ...selectedInspeccion, motivo_actualizacion: motivo, fecha_actualizacion: fechaActualizacion };
      setInspeccionToEdit(copy);
      setShowActualizacionModal(false);
      setShowDetailModal(false);
      setActiveTab('nueva');
    }
  };

  const misInspecciones = inspecciones.filter(
    (i) => i.creado_por_id === user?.id || (i as any).coordinador_id === user?.id
  );
  const totalAprobados = inspecciones.filter(
    (i) => i.resultado_general === 'aprobado' || i.resultado_general === 'apto'
  ).length;
  const totalConHallazgos = inspecciones.filter(
    (i) => i.resultado_general === 'con_hallazgos' || i.resultado_general === 'no_apto'
  ).length;

  const navItems = [
    { id: 'resumen', label: 'Resumen', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'nueva', label: inspeccionToEdit ? 'Re-inspección' : 'Nueva Inspección', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'vehiculos', label: `Vehículos Inspeccionados (${vehiculosInspeccionados.length})`, icon: <Truck className="w-4 h-4" /> },
    { id: 'historial', label: `Historial (${inspecciones.length})`, icon: <ClipboardList className="w-4 h-4" /> },
  ];

  return (
    <>
      <ToastNotification
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <InspeccionDetailModal
        isOpen={showDetailModal}
        inspeccion={selectedInspeccion}
        userRol="tecnico_inspector"
        onClose={() => setShowDetailModal(false)}
        onEditar={handleIniciarEditar}
      />

      <ActualizacionModal
        isOpen={showActualizacionModal}
        inspeccion={selectedInspeccion}
        onConfirm={handleConfirmActualizacionModal}
        onCancel={() => setShowActualizacionModal(false)}
      />

      <AppShell
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => {
          if (id !== 'nueva') setInspeccionToEdit(null);
          setActiveTab(id as Tab);
        }}
        headerRight={<NotificationCenter />}
      >
        {!isOnline && (
          <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-2 flex items-center gap-2 text-xs text-[#92400E]">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            Modo sin conexión — las inspecciones se guardan localmente
            {pendingCount > 0 && ` (${pendingCount} pendiente(s))`}.
          </div>
        )}
        {isOnline && isSyncing && (
          <div className="bg-[#EFF6FF] border-b border-[#BFDBFE] px-6 py-2 flex items-center gap-2 text-xs text-[#1E40AF]">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            Sincronizando inspecciones offline...
          </div>
        )}

        {loading ? (
          <div className="px-6 py-12 flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-8 w-full rounded" />
            ))}
          </div>
        ) : activeTab === 'resumen' ? (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Técnico Inspector</p>
              <h1 className="text-base font-semibold text-[#111827]">Resumen Operativo</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Panel de control de inspecciones técnicas de flota — Sointer Ltda.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                className="w-full sm:w-auto justify-center text-center py-2.5 px-4 text-sm font-medium whitespace-normal min-h-[2.5rem] h-auto"
                onClick={() => { setInspeccionToEdit(null); setActiveTab('nueva'); }}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>{inspeccionToEdit ? 'Re-inspección' : 'Nueva Inspección'}</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-center py-2.5 px-4 text-sm font-medium whitespace-normal min-h-[2.5rem] h-auto"
                onClick={() => setActiveTab('historial')}
              >
                <span>Ver historial completo</span>
              </Button>
            </div>

            <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-[#374151]">Mis inspecciones realizadas</td>
                    <td className="text-right font-semibold tabular-nums">{misInspecciones.length}</td>
                  </tr>
                  <tr>
                    <td className="text-[#374151]">Vehículos aprobados</td>
                    <td className="text-right">
                      <span className="font-semibold tabular-nums text-[#065F46]">{totalAprobados}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-[#374151]">Con hallazgos subestándar</td>
                    <td className="text-right">
                      <span className="font-semibold tabular-nums text-[#991B1B]">{totalConHallazgos}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-[#374151]">Vehículos inspeccionados</td>
                    <td className="text-right font-semibold tabular-nums">{vehiculosInspeccionados.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'nueva' ? (
          <div className="p-6">
            <ChecklistForm
              sistemas={sistemas}
              catalogo={catalogo}
              empresas={empresas}
              vehiculos={vehiculos}
              initialInspeccionToEdit={inspeccionToEdit}
              onSuccess={handleFormSuccess}
              onCancel={() => { setInspeccionToEdit(null); setActiveTab('resumen'); }}
            />
          </div>
        ) : activeTab === 'vehiculos' ? (
          <div className="p-6 space-y-4">
            <h1 className="text-base font-semibold text-[#111827]">Vehículos Inspeccionados</h1>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                  <tr>
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">Vehículo</th>
                    <th className="py-3 px-4">Último Km</th>
                    <th className="py-3 px-4">Total Inspecciones</th>
                    <th className="py-3 px-4">Última Fecha</th>
                    <th className="py-3 px-4">Inspector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vehiculosInspeccionados.map((v) => (
                    <tr key={v.placa} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-100 uppercase">{v.placa}</td>
                      <td className="py-3 px-4">{v.marca} {v.modelo} ({v.año})</td>
                      <td className="py-3 px-4">{v.kilometraje} Km</td>
                      <td className="py-3 px-4 font-bold text-blue-400">{v.total_inspecciones}</td>
                      <td className="py-3 px-4 font-mono">{formatFechaColombia(v.ultima_fecha)}</td>
                      <td className="py-3 px-4">{v.nombre_tecnico_ultimo || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Técnico Inspector</p>
              <h1 className="text-base font-semibold text-[#111827]">Historial con Árbol de Subregistros</h1>
            </div>
            <HistorialConArbol
              inspecciones={inspecciones}
              userRol="tecnico_inspector"
              onVer={handleVerInspeccion}
              onEditar={handleIniciarEditar}
            />
          </div>
        )}
      </AppShell>
    </>
  );
};

export const CoordinadorDashboard = TecnicoInspectorDashboard;
