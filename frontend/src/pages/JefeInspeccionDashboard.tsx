import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Vehiculo, Inspeccion, EmpresaContratista } from '../types';
import { AuditLogItem } from '../types/auditLog';
import { apiFetch } from '../lib/api';
import { VehiculosTable } from '../components/vehiculo/VehiculosTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ToastNotification } from '../components/ui/ToastNotification';
import { AppShell } from '../components/ui/AppShell';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { AprobacionModal } from '../components/inspeccion/AprobacionModal';
import {
  Download,
  RefreshCw,
  Eye,
  ClipboardList,
  ShieldAlert,
  Code,
  Award,
  Clock,
  Truck,
  CheckCircle2,
} from 'lucide-react';

type Tab = 'pendientes' | 'trazabilidad' | 'vehiculos' | 'auditoria';

export const JefeInspeccionDashboard: React.FC = () => {
  useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pendientes');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [filterEmpresaId, setFilterEmpresaId] = useState<string>('');
  const [filterResultado, setFilterResultado] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');

  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null);
  const [isAprobacionOpen, setIsAprobacionOpen] = useState<boolean>(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let endpoint = '/inspecciones?limit=100';
      const params = new URLSearchParams();
      if (filterEmpresaId) params.append('empresa_contratista_id', filterEmpresaId);
      if (filterResultado) params.append('resultado_general', filterResultado);
      if (filterEstado) params.append('estado', filterEstado);
      if (params.toString()) endpoint += `&${params.toString()}`;

      const [vData, iData, eData, aData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<Inspeccion[]>(endpoint),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas').catch(() => []),
        apiFetch<AuditLogItem[]>('/audit-logs?limit=100').catch(() => []),
      ]);
      setVehiculos(vData);
      setInspecciones(iData);
      setEmpresas(eData);
      setAuditLogs(aData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterEmpresaId, filterResultado, filterEstado]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let endpoint = '/export/inspecciones?';
      const params = new URLSearchParams();
      if (filterEmpresaId) params.append('empresa_contratista_id', filterEmpresaId);
      if (filterResultado) params.append('resultado_general', filterResultado);
      const blob = await apiFetch<Blob>(`${endpoint}${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_sointer_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar';
      setToast({ message: msg, type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleOpenAprobacionModal = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setIsAprobacionOpen(true);
  };

  const handleApprovedSuccess = () => {
    setIsAprobacionOpen(false);
    setToast({ message: 'Inspección aprobada. Sello digital emitido.', type: 'success' });
    loadData();
  };

  const pendientesAprobacion = inspecciones.filter(
    (i) => i.estado === 'pendiente_aprobacion' || i.estado === 'con_hallazgos'
  );
  const aprobadas = inspecciones.filter((i) => i.estado === 'aprobado');

  const navItems = [
    { id: 'pendientes',   label: `Pendientes (${pendientesAprobacion.length})`, icon: <Clock className="w-4 h-4" /> },
    { id: 'trazabilidad', label: `Trazabilidad (${inspecciones.length})`,        icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'vehiculos',    label: `Flota (${vehiculos.length})`,                  icon: <Truck className="w-4 h-4" /> },
    { id: 'auditoria',    label: `Auditoría (${auditLogs.length})`,              icon: <ShieldAlert className="w-4 h-4" /> },
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
        onTabChange={(id) => setActiveTab(id as Tab)}
        headerRight={<NotificationCenter />}
      >
        <div className="p-6 space-y-5">

          {/* ── Métricas compactas ─────────────────────────────── */}
          <div className="flex flex-wrap gap-4 pb-4 border-b border-[#E5E7EB]">
            <div>
              <p className="text-xs text-[#9CA3AF]">Pendientes firma</p>
              <p className="text-xl font-semibold tabular-nums text-[#92400E]">{pendientesAprobacion.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">Aprobadas</p>
              <p className="text-xl font-semibold tabular-nums text-[#065F46]">{aprobadas.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">Total intervenidas</p>
              <p className="text-xl font-semibold tabular-nums text-[#111827]">{inspecciones.length}</p>
            </div>
            <div>
              <p className="text-xs text-[#9CA3AF]">Empresas contratistas</p>
              <p className="text-xl font-semibold tabular-nums text-[#111827]">{empresas.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded" />)}
            </div>
          ) : (
            <>
              {/* ── TAB: PENDIENTES ─────────────────────────────── */}
              {activeTab === 'pendientes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-semibold text-[#111827]">Cola de Aprobación</h1>
                      <p className="text-sm text-[#6B7280]">
                        Inspecciones procesadas que requieren firma y sello de dictamen oficial.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={loadData}>
                      <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                    </Button>
                  </div>

                  {pendientesAprobacion.length === 0 ? (
                    <div className="border border-[#E5E7EB] rounded-container px-6 py-10 flex flex-col items-center gap-2 text-center">
                      <CheckCircle2 className="w-5 h-5 text-[#065F46]" />
                      <p className="text-sm text-[#374151] font-medium">Al día — no hay inspecciones pendientes.</p>
                    </div>
                  ) : (
                    <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="table-industrial">
                          <thead>
                            <tr>
                              <th>N° / Rev.</th>
                              <th>Placa</th>
                              <th>Empresa</th>
                              <th>Fecha</th>
                              <th>Dictamen</th>
                              <th>Hallazgos pend.</th>
                              <th className="text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendientesAprobacion.map((ins) => {
                              const emp = empresas.find((e) => e.id === ins.empresa_contratista_id);
                              const hallazgosPend = ins.hallazgos?.filter((h) => !h.atendido).length || 0;
                              const placa = ins.vehiculo?.patente || ins.vehiculo_patente || ins.vehiculo_id;
                              return (
                                <tr key={ins.id}>
                                  <td className="font-mono text-xs">
                                    <span className="font-semibold text-[#111827]">N°{ins.numero_inspeccion}</span>
                                    <span className="text-[#9CA3AF] ml-1">R{ins.numero_revision}</span>
                                  </td>
                                  <td className="font-semibold text-sm">{placa}</td>
                                  <td className="text-[#6B7280] text-xs">{emp?.nombre || ins.empresa_contratista_nombre || '—'}</td>
                                  <td className="font-mono text-xs text-[#6B7280]">
                                    {new Date(ins.fecha).toLocaleDateString('es-CO')}
                                  </td>
                                  <td>
                                    <Badge variant={ins.resultado_general === 'aprobado' ? 'apto' : 'no_apto'}>
                                      {ins.resultado_general?.replace(/_/g, ' ') ?? '—'}
                                    </Badge>
                                  </td>
                                  <td>
                                    {hallazgosPend > 0 ? (
                                      <span className="text-xs text-[#991B1B] font-medium">{hallazgosPend} pendiente(s)</span>
                                    ) : (
                                      <span className="text-xs text-[#9CA3AF]">—</span>
                                    )}
                                  </td>
                                  <td className="text-right">
                                    <Button variant="secondary" size="sm" onClick={() => handleOpenAprobacionModal(ins)}>
                                      <Award className="w-3.5 h-3.5" /> Revisar y aprobar
                                    </Button>
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

              {/* ── TAB: TRAZABILIDAD ───────────────────────────── */}
              {activeTab === 'trazabilidad' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-semibold text-[#111827]">Trazabilidad e Historial</h1>
                      <p className="text-sm text-[#6B7280]">Registro completo de todas las inspecciones intervenidas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={loadData}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleExportExcel} isLoading={exporting}>
                        <Download className="w-3.5 h-3.5" /> Exportar .xlsx
                      </Button>
                    </div>
                  </div>

                  {/* Filtros */}
                  <div className="flex flex-wrap gap-3">
                    <div className="w-52">
                      <Select
                        label="Empresa"
                        value={filterEmpresaId}
                        onChange={(e) => setFilterEmpresaId(e.target.value)}
                        options={[
                          { value: '', label: 'Todas' },
                          ...empresas.map((e) => ({ value: e.id, label: e.nombre })),
                        ]}
                      />
                    </div>
                    <div className="w-44">
                      <Select
                        label="Estado"
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        options={[
                          { value: '', label: 'Todos' },
                          { value: 'en_revision', label: 'En revisión' },
                          { value: 'con_hallazgos', label: 'Con hallazgos' },
                          { value: 'pendiente_aprobacion', label: 'Pend. aprobación' },
                          { value: 'aprobado', label: 'Aprobado' },
                        ]}
                      />
                    </div>
                    <div className="w-44">
                      <Select
                        label="Dictamen"
                        value={filterResultado}
                        onChange={(e) => setFilterResultado(e.target.value)}
                        options={[
                          { value: '', label: 'Todos' },
                          { value: 'aprobado', label: 'Aprobado' },
                          { value: 'con_hallazgos', label: 'Con hallazgos' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-industrial">
                        <thead>
                          <tr>
                            <th>N° Insp.</th>
                            <th>Fecha</th>
                            <th>Placa</th>
                            <th>Empresa</th>
                            <th>Rev.</th>
                            <th>Estado</th>
                            <th>Sello</th>
                            <th className="text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspecciones.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-10 text-center text-[#9CA3AF] text-sm">
                                Sin resultados para los filtros seleccionados.
                              </td>
                            </tr>
                          ) : inspecciones.map((ins) => {
                            const emp = empresas.find((e) => e.id === ins.empresa_contratista_id);
                            const placa = ins.vehiculo?.patente || ins.vehiculo_patente || ins.vehiculo_id;
                            const estadoVariant: any = {
                              aprobado: 'apto',
                              con_hallazgos: 'no_apto',
                              pendiente_aprobacion: 'revision',
                              en_revision: 'revision',
                            };
                            return (
                              <tr key={ins.id}>
                                <td className="font-mono text-xs font-semibold">N°{ins.numero_inspeccion}</td>
                                <td className="font-mono text-xs text-[#6B7280]">
                                  {new Date(ins.fecha).toLocaleDateString('es-CO')}
                                </td>
                                <td className="font-semibold text-sm">{placa}</td>
                                <td className="text-xs text-[#6B7280]">{emp?.nombre || ins.empresa_contratista_nombre || '—'}</td>
                                <td className="font-mono text-xs text-[#9CA3AF]">R{ins.numero_revision}</td>
                                <td>
                                  <Badge variant={estadoVariant[ins.estado] ?? 'neutral'}>
                                    {ins.estado.replace(/_/g, ' ')}
                                  </Badge>
                                </td>
                                <td>
                                  {ins.sello_url ? (
                                    <Badge variant="apto">Emitido</Badge>
                                  ) : (
                                    <span className="text-xs text-[#9CA3AF]">Pendiente</span>
                                  )}
                                </td>
                                <td className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenAprobacionModal(ins)}>
                                    <Eye className="w-3.5 h-3.5" /> Ver
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: VEHÍCULOS ──────────────────────────────── */}
              {activeTab === 'vehiculos' && (
                <div>
                  <div className="mb-4">
                    <h1 className="text-base font-semibold text-[#111827]">Flota de Vehículos</h1>
                    <p className="text-sm text-[#6B7280]">Vehículos registrados en el sistema de inspección.</p>
                  </div>
                  <VehiculosTable vehiculos={vehiculos} />
                </div>
              )}

              {/* ── TAB: AUDITORÍA ──────────────────────────────── */}
              {activeTab === 'auditoria' && (
                <div className="space-y-3">
                  <div>
                    <h1 className="text-base font-semibold text-[#111827]">Bitácora de Auditoría</h1>
                    <p className="text-sm text-[#6B7280]">Registro de todas las acciones del sistema.</p>
                  </div>
                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-industrial">
                        <thead>
                          <tr>
                            <th>Fecha / Hora</th>
                            <th>Acción</th>
                            <th>Entidad</th>
                            <th>IP</th>
                            <th className="text-right">Payload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-[#9CA3AF] text-sm">
                                No hay registros de auditoría.
                              </td>
                            </tr>
                          ) : auditLogs.map((log) => (
                            <tr key={log.id}>
                              <td className="font-mono text-xs text-[#6B7280]">
                                {new Date(log.timestamp).toLocaleString('es-CO')}
                              </td>
                              <td className="text-xs font-semibold uppercase tracking-wide">{log.accion}</td>
                              <td className="text-xs text-[#374151]">{log.entidad}</td>
                              <td className="font-mono text-xs text-[#9CA3AF]">{log.ip || '—'}</td>
                              <td className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedAuditLog(log)}>
                                  <Code className="w-3.5 h-3.5" /> JSON
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modales */}
        <AprobacionModal
          inspeccion={selectedInspeccion}
          isOpen={isAprobacionOpen}
          onClose={() => { setIsAprobacionOpen(false); setSelectedInspeccion(null); }}
          onApproved={handleApprovedSuccess}
        />

        <Modal
          isOpen={!!selectedAuditLog}
          onClose={() => setSelectedAuditLog(null)}
          title="Detalle de Auditoría"
          description={selectedAuditLog ? `${selectedAuditLog.accion} · ${selectedAuditLog.entidad}` : undefined}
          maxWidth="max-w-2xl"
        >
          {selectedAuditLog && (
            <pre className="p-4 bg-[#111827] text-[#F3F4F6] font-mono text-xs rounded-container overflow-x-auto leading-relaxed">
              {JSON.stringify(selectedAuditLog.detalle || {}, null, 2)}
            </pre>
          )}
        </Modal>
      </AppShell>
    </>
  );
};
