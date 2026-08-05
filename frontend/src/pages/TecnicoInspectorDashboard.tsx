import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion } from '../types';
import { apiFetch } from '../lib/api';
import { ChecklistForm } from '../components/inspeccion/ChecklistForm';
import { VehiculosTable } from '../components/vehiculo/VehiculosTable';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ToastNotification } from '../components/ui/ToastNotification';
import { AppShell } from '../components/ui/AppShell';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { MantenimientoPanel } from '../components/mantenimiento/MantenimientoPanel';
import {
  PlusCircle,
  ClipboardList,
  Truck,
  WifiOff,
  RefreshCw,
  Wrench,
  RotateCw,
} from 'lucide-react';

type Tab = 'resumen' | 'nueva' | 'vehiculos' | 'historial' | 'mantenimiento';

function resultadoBadge(ins: Inspeccion) {
  const esHallazgo = ins.resultado_general === 'con_hallazgos' || ins.resultado_general === 'no_apto';
  return <Badge variant={esHallazgo ? 'no_apto' : 'apto'}>{esHallazgo ? 'Con hallazgos' : 'Aprobado'}</Badge>;
}

function estadoBadge(estado: string) {
  const map: Record<string, 'revision' | 'apto' | 'no_apto' | 'neutral'> = {
    en_revision: 'revision',
    pendiente_aprobacion: 'revision',
    aprobado: 'apto',
    con_hallazgos: 'no_apto',
  };
  return (
    <Badge variant={map[estado] ?? 'neutral'}>
      {estado.replace(/_/g, ' ')}
    </Badge>
  );
}

export const TecnicoInspectorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [sistemas, setSistemas] = useState<CatalogoSistema[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [inspeccionToEdit, setInspeccionToEdit] = useState<Inspeccion | null>(null);

  const { isOnline, isSyncing, pendingCount } = useOfflineSync((syncedCount) => {
    setToast({ message: `Sincronización completada: ${syncedCount} inspección(es) subida(s).`, type: 'success' });
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
        apiFetch<Inspeccion[]>('/inspecciones'),
      ]);
      setVehiculos(vData);
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
    setActiveTab('historial');
    setToast({
      message: result.numero_revision > 1
        ? `Re-inspección N° ${result.numero_inspeccion} corregida (Rev. ${result.numero_revision}).`
        : `Inspección N° ${result.numero_inspeccion} creada.`,
      type: 'success',
    });
    loadData();
  };

  const handleIniciarCorregir = (ins: Inspeccion) => {
    setInspeccionToEdit(ins);
    setActiveTab('nueva');
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
    { id: 'resumen',      label: 'Resumen',         icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'nueva',        label: inspeccionToEdit ? 'Re-inspección' : 'Nueva Inspección', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'vehiculos',    label: `Flota (${vehiculos.length})`,      icon: <Truck className="w-4 h-4" /> },
    { id: 'historial',    label: `Inspecciones (${inspecciones.length})`, icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'mantenimiento',label: 'Hallazgos',        icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <>
      <ToastNotification
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
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
        {/* ── Banners de estado de conectividad ─────────────── */}
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

        {/* ── Contenido por tab ─────────────────────────────── */}
        {loading ? (
          <div className="px-6 py-12 flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-8 w-full rounded" />
            ))}
          </div>
        ) : activeTab === 'resumen' ? (
          <div className="p-6 space-y-5">
            {/* Page header editorial */}
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Técnico Inspector</p>
              <h1 className="text-base font-semibold text-[#111827]">Resumen Operativo</h1>
              <p className="text-sm text-[#6B7280] mt-1">
                Panel de control de inspecciones técnicas de flota — Sointer Ltda.
              </p>
            </div>

            {/* Acción primaria */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => { setInspeccionToEdit(null); setActiveTab('nueva'); }}
              >
                <PlusCircle className="w-4 h-4" /> Nueva Inspección
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setActiveTab('historial')}
              >
                Ver historial
              </Button>
            </div>

            {/* Métricas — tabla de indicadores, no widget cards */}
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
                    <td className="text-[#374151]">Vehículos en flota</td>
                    <td className="text-right font-semibold tabular-nums">{vehiculos.length}</td>
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
          <div className="p-6">
            <VehiculosTable vehiculos={vehiculos} />
          </div>

        ) : activeTab === 'mantenimiento' ? (
          <div className="p-6">
            <MantenimientoPanel vehiculos={vehiculos} role="coordinador" />
          </div>

        ) : (
          /* Historial de inspecciones */
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Inspecciones</p>
              <h1 className="text-base font-semibold text-[#111827]">Historial de Inspecciones</h1>
            </div>

            {inspecciones.length === 0 ? (
              <div className="border border-[#E5E7EB] rounded-container px-6 py-10 text-center">
                <p className="text-sm text-[#6B7280] mb-3">Aún no se han registrado inspecciones.</p>
                <Button variant="primary" size="sm" onClick={() => setActiveTab('nueva')}>
                  <PlusCircle className="w-4 h-4" /> Registrar primera inspección
                </Button>
              </div>
            ) : (
              <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-industrial">
                    <thead>
                      <tr>
                        <th>Planilla / Rev.</th>
                        <th>Fecha · Hora</th>
                        <th>Placa</th>
                        <th>Empresa</th>
                        <th>Dictamen</th>
                        <th>Estado</th>
                        <th className="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspecciones.map((ins) => {
                        const esHallazgo = ins.resultado_general === 'con_hallazgos' || ins.estado === 'con_hallazgos';
                        return (
                          <tr key={ins.id}>
                            <td className="font-mono text-xs">
                              <span className="font-semibold text-[#111827]">N°{ins.numero_inspeccion || 4800}</span>
                              <span className="text-[#9CA3AF] ml-1">Rev.{ins.numero_revision || 1}</span>
                            </td>
                            <td className="font-mono text-xs text-[#6B7280]">
                              {new Date(ins.fecha).toLocaleDateString('es-CO')}
                              {ins.hora_inspeccion && <span className="ml-1 text-[#9CA3AF]">{ins.hora_inspeccion}</span>}
                            </td>
                            <td className="font-semibold text-sm text-[#111827]">
                              {ins.vehiculo_patente || ins.vehiculo_id}
                            </td>
                            <td className="text-[#6B7280] text-xs">
                              {ins.empresa_contratista_nombre || 'Ext.'}
                            </td>
                            <td>{resultadoBadge(ins)}</td>
                            <td>{estadoBadge(ins.estado)}</td>
                            <td className="text-right">
                              {esHallazgo ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleIniciarCorregir(ins)}
                                >
                                  <RotateCw className="w-3.5 h-3.5" /> Re-inspeccionar
                                </Button>
                              ) : (
                                <span className="text-xs text-[#9CA3AF]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </AppShell>
    </>
  );
};

// Alias de compatibilidad
export const CoordinadorDashboard = TecnicoInspectorDashboard;
