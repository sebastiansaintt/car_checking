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
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { AprobacionModal } from '../components/inspeccion/AprobacionModal';
import {
  Download,
  Filter,
  LogOut,
  Truck,
  CheckCircle2,
  RefreshCw,
  Eye,
  ClipboardList,
  ShieldAlert,
  Code,
  Building2,
  Award,
  Clock,
  CheckCheck
} from 'lucide-react';

export const JefeInspeccionDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [activeTab, setActiveTab] = useState<'pendientes' | 'trazabilidad' | 'vehiculos' | 'auditoria'>('pendientes');
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>('');
  const [filterResultado, setFilterResultado] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');

  // Modals
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

      if (params.toString()) {
        endpoint += `&${params.toString()}`;
      }

      const auditEndpoint = '/audit-logs?limit=100';

      const [vData, iData, eData, aData] = await Promise.all([
        apiFetch<Vehiculo[]>('/vehiculos'),
        apiFetch<Inspeccion[]>(endpoint),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas').catch(() => []),
        apiFetch<AuditLogItem[]>(auditEndpoint).catch(() => [])
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

  useEffect(() => {
    loadData();
  }, [filterEmpresaId, filterResultado, filterEstado]);

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
      a.download = `reporte_interventoria_sointer_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar a Excel';
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
    setToast({ message: 'Inspección aprobada con éxito. Sello digital emitido.', type: 'success' });
    loadData();
  };

  // KPIs
  const pendientesAprobacion = inspecciones.filter(
    (i) => i.estado === 'pendiente_aprobacion' || i.estado === 'con_hallazgos'
  );
  const aprobadas = inspecciones.filter((i) => i.estado === 'aprobado');
  const totalInspecciones = inspecciones.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <ToastNotification
        message={toast?.message || null}
        type={toast?.type || 'success'}
        onClose={() => setToast(null)}
      />

      {/* Header Sointer Ltda. */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                SOINTER LTDA. <span className="text-xs bg-emerald-600/30 text-emerald-400 font-semibold px-2 py-0.5 rounded border border-emerald-500/30">Interventoría</span>
              </h1>
              <p className="text-xs text-slate-400">Jefe de Inspección (Supervisión & Aprobaciones) — {user?.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-700 text-slate-200 hover:bg-slate-800">
              <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 pb-3 -mx-4 px-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'pendientes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" /> Pendientes de Aprobación ({pendientesAprobacion.length})
            </button>
            <button
              onClick={() => setActiveTab('trazabilidad')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'trazabilidad'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Trazabilidad & Historial ({inspecciones.length})
            </button>
            <button
              onClick={() => setActiveTab('vehiculos')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'vehiculos'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" /> Flota de Vehículos ({vehiculos.length})
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'auditoria'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Bitácora de Auditoría ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Pendientes de Firma/Aprobación</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{pendientesAprobacion.length}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Inspecciones Aprobadas</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{aprobadas.length}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Inspecciones Intervenidas</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalInspecciones}</h3>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Empresas Contratistas</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">{empresas.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TAB 1: PENDIENTES DE APROBACIÓN */}
        {activeTab === 'pendientes' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" /> Cola Prioritaria para Firma de Aprobación
                </h3>
                <p className="text-xs text-slate-500">
                  Inspecciones procesadas por técnicos que requieren evaluación y firma de dictamen oficial Sointer Ltda.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </Button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl">
                Cargando cola de aprobaciones...
              </div>
            ) : pendientesAprobacion.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500 bg-white border border-slate-200 rounded-xl flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="font-semibold text-slate-800">¡Al día! No hay inspecciones pendientes por aprobar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendientesAprobacion.map((ins) => {
                  const emp = empresas.find((e) => e.id === ins.empresa_contratista_id);
                  const hallazgosPend = ins.hallazgos?.filter((h) => !h.atendido).length || 0;
                  const placa = ins.vehiculo?.patente || ins.vehiculo_patente || ins.vehiculo_id;

                  return (
                    <div
                      key={ins.id}
                      className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                            N° {ins.numero_inspeccion} (Rev. #{ins.numero_revision})
                          </span>
                          <Badge variant={ins.estado === 'pendiente_aprobacion' ? 'estandar' : 'subestandar'}>
                            {ins.estado.toUpperCase().replace('_', ' ')}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            <Truck className="w-4 h-4 text-brand" /> {placa}
                          </h4>
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{emp?.nombre || ins.empresa_contratista_nombre || 'Empresa Contratista no asignada'}</span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 text-[10px] block">Dictamen General</span>
                            <span className="font-semibold capitalize text-slate-800">{ins.resultado_general}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <span className="text-slate-400 text-[10px] block">Hallazgos Sin Atender</span>
                            <span className={`font-semibold ${hallazgosPend > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {hallazgosPend} pendiente(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(ins.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenAprobacionModal(ins)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <Award className="w-3.5 h-3.5" /> Revisar & Aprobar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRAZABILIDAD & HISTORIAL */}
        {activeTab === 'trazabilidad' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Filter className="w-4 h-4 text-slate-500" /> Filtros de Trazabilidad
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Empresa Contratista"
                  value={filterEmpresaId}
                  onChange={(e) => setFilterEmpresaId(e.target.value)}
                  options={[
                    { value: '', label: 'Todas las empresas contratistas' },
                    ...empresas.map((e) => ({ value: e.id, label: e.nombre }))
                  ]}
                />
                <Select
                  label="Estado de Inspección"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  options={[
                    { value: '', label: 'Todos los estados' },
                    { value: 'en_revision', label: 'En Revisión' },
                    { value: 'con_hallazgos', label: 'Con Hallazgos' },
                    { value: 'pendiente_aprobacion', label: 'Pendiente Aprobación' },
                    { value: 'aprobado', label: 'Aprobado' }
                  ]}
                />
                <Select
                  label="Dictamen General"
                  value={filterResultado}
                  onChange={(e) => setFilterResultado(e.target.value)}
                  options={[
                    { value: '', label: 'Todos los dictámenes' },
                    { value: 'aprobado', label: 'Aprobado' },
                    { value: 'con_hallazgos', label: 'Con Hallazgos' }
                  ]}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">Cargando trazabilidad...</div>
              ) : inspecciones.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">No se encontraron inspecciones registrados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">N° Ins.</th>
                        <th className="py-3.5 px-4">Fecha</th>
                        <th className="py-3.5 px-4">Vehículo / Placa</th>
                        <th className="py-3.5 px-4">Empresa Contratista</th>
                        <th className="py-3.5 px-4">Revisión</th>
                        <th className="py-3.5 px-4">Estado</th>
                        <th className="py-3.5 px-4">Sello Digital</th>
                        <th className="py-3.5 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspecciones.map((ins) => {
                        const emp = empresas.find((e) => e.id === ins.empresa_contratista_id);
                        const hasSello = !!ins.sello_url;
                        const placa = ins.vehiculo?.patente || ins.vehiculo_patente || ins.vehiculo_id;

                        return (
                          <tr key={ins.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              N° {ins.numero_inspeccion}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {new Date(ins.fecha).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                              {placa}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">
                              {emp?.nombre || ins.empresa_contratista_nombre || 'Externo'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              Rev. #{ins.numero_revision}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={ins.estado === 'aprobado' ? 'estandar' : ins.estado === 'con_hallazgos' ? 'subestandar' : 'neutral'}>
                                {ins.estado.toUpperCase().replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {hasSello ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <Award className="w-3 h-3 text-emerald-600" /> Emitido
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Pendiente</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAprobacionModal(ins)}
                              >
                                <Eye className="w-3.5 h-3.5" /> Detalle / Sello
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
          </div>
        )}

        {/* TAB 3: VEHÍCULOS */}
        {activeTab === 'vehiculos' && <VehiculosTable vehiculos={vehiculos} />}

        {/* TAB 4: AUDITORÍA */}
        {activeTab === 'auditoria' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Acción</th>
                      <th className="py-3 px-4">Entidad</th>
                      <th className="py-3 px-4">IP</th>
                      <th className="py-3 px-4 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {new Date(log.timestamp).toLocaleString('es-CL')}
                        </td>
                        <td className="py-3 px-4 font-bold uppercase">{log.accion}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{log.entidad}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{log.ip || 'system'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedAuditLog(log)}>
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
      </main>

      {/* Modal de Aprobación & Sello Digital */}
      <AprobacionModal
        inspeccion={selectedInspeccion}
        isOpen={isAprobacionOpen}
        onClose={() => {
          setIsAprobacionOpen(false);
          setSelectedInspeccion(null);
        }}
        onApproved={handleApprovedSuccess}
      />

      {/* Modal AuditLog JSON */}
      <Modal
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        title="Detalle JSON de Auditoría"
      >
        {selectedAuditLog && (
          <div className="space-y-3 text-xs">
            <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg overflow-x-auto">
              {JSON.stringify(selectedAuditLog.detalle || {}, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};
