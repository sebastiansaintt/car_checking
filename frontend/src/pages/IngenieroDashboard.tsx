import React, { useState, useEffect } from 'react';
import { Inspeccion, EmpresaContratista, VehiculoInspeccionado } from '../types';
import { apiFetch } from '../lib/api';
import { AppShell } from '../components/ui/AppShell';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { HistorialConArbol } from '../components/inspeccion/HistorialConArbol';
import { InspeccionDetailModal } from '../components/inspeccion/InspeccionDetailModal';
import { AprobacionModal } from '../components/inspeccion/AprobacionModal';
import { PlanillaPDF } from '../components/inspeccion/PlanillaPDF';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ToastNotification } from '../components/ui/ToastNotification';
import { formatFechaColombia } from '../lib/dateUtils';
import { ShieldCheck, ClipboardList, Building2, Truck, Plus, CheckCircle2 } from 'lucide-react';

type Tab = 'pendientes' | 'historial' | 'empresas' | 'vehiculos';

export const IngenieroDashboard: React.FC = () => {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoInspeccionado[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pendientes');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modales
  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showAprobacionModal, setShowAprobacionModal] = useState<boolean>(false);
  const [pdfInspeccion, setPdfInspeccion] = useState<Inspeccion | null>(null);

  // CRUD Empresa Contratista Modal
  const [showEmpresaModal, setShowEmpresaModal] = useState<boolean>(false);
  const [empresaNombre, setEmpresaNombre] = useState<string>('');
  const [empresaRut, setEmpresaRut] = useState<string>('');
  const [empresaContacto, setEmpresaContacto] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [iData, eData, vData] = await Promise.all([
        apiFetch<Inspeccion[]>('/inspecciones'),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas'),
        apiFetch<VehiculoInspeccionado[]>('/inspecciones/vehiculos-inspeccionados'),
      ]);
      setInspecciones(iData);
      setEmpresas(eData);
      setVehiculos(vData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cargar datos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const pendientesAprobacion = inspecciones.filter(
    (i) => i.estado === 'pendiente_aprobacion' || i.estado === 'en_revision'
  );

  const handleVer = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setShowDetailModal(true);
  };

  const handleIniciarAprobar = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setShowAprobacionModal(true);
  };

  const handleDescargarPDF = (ins: Inspeccion) => {
    setPdfInspeccion(ins);
  };

  const handleAprobarSuccess = () => {
    setShowAprobacionModal(false);
    setToast({ message: 'Inspección aprobada y sello digital emitido correctamente.', type: 'success' });
    loadData();
  };

  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaNombre.trim()) return;

    try {
      await apiFetch<EmpresaContratista>('/empresas-contratistas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: empresaNombre.trim(),
          rut: empresaRut.trim() || undefined,
          contacto: empresaContacto.trim() || undefined,
        }),
      });
      setToast({ message: `Empresa "${empresaNombre}" creada con éxito.`, type: 'success' });
      setShowEmpresaModal(false);
      setEmpresaNombre('');
      setEmpresaRut('');
      setEmpresaContacto('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear empresa';
      setToast({ message: msg, type: 'error' });
    }
  };

  const navItems = [
    { id: 'pendientes', label: `Cola Aprobación (${pendientesAprobacion.length})`, icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'historial', label: `Historial (${inspecciones.length})`, icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'empresas', label: `Empresas (${empresas.length})`, icon: <Building2 className="w-4 h-4" /> },
    { id: 'vehiculos', label: `Vehículos (${vehiculos.length})`, icon: <Truck className="w-4 h-4" /> },
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
        userRol="ingeniero"
        onClose={() => setShowDetailModal(false)}
        onDescargarPDF={handleDescargarPDF}
      />

      {showAprobacionModal && (
        <AprobacionModal
          inspeccion={selectedInspeccion}
          isOpen={showAprobacionModal}
          onClose={() => setShowAprobacionModal(false)}
          onApproved={handleAprobarSuccess}
        />
      )}

      {pdfInspeccion && (
        <PlanillaPDF
          isOpen={!!pdfInspeccion}
          inspeccion={pdfInspeccion}
          onClose={() => setPdfInspeccion(null)}
        />
      )}

      <AppShell
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        headerRight={<NotificationCenter />}
      >
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10 w-full rounded" />
            ))}
          </div>
        ) : activeTab === 'pendientes' ? (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">Ingeniero de Calidad</p>
              <h1 className="text-base font-semibold text-slate-100">Cola de Aprobación y Emisión de Sello</h1>
            </div>

            {pendientesAprobacion.length === 0 ? (
              <div className="border border-slate-800 bg-slate-900 rounded-xl p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No hay inspecciones pendientes por aprobación.</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">N° Planilla</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Placa</th>
                      <th className="py-3 px-4">Empresa</th>
                      <th className="py-3 px-4">Dictamen</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendientesAprobacion.map((ins) => (
                      <tr key={ins.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-slate-100">#{ins.numero_inspeccion}</td>
                        <td className="py-3 px-4 font-mono">{formatFechaColombia(ins.fecha)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-200 uppercase">{ins.vehiculo_patente || ins.vehiculo?.patente}</td>
                        <td className="py-3 px-4">{ins.empresa_contratista_nombre || 'N/A'}</td>
                        <td className="py-3 px-4 capitalize font-semibold text-amber-400">{ins.resultado_general}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleVer(ins)}>
                              Ver Detalle
                            </Button>
                            <Button variant="primary" size="sm" onClick={() => handleIniciarAprobar(ins)}>
                              <ShieldCheck className="w-3.5 h-3.5" /> Aprobar & Sello
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'historial' ? (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">Ingeniero de Calidad</p>
              <h1 className="text-base font-semibold text-slate-100">Historial de Inspecciones Técnicas</h1>
            </div>
            <HistorialConArbol
              inspecciones={inspecciones}
              userRol="ingeniero"
              onVer={handleVer}
              onDescargarPDF={handleDescargarPDF}
            />
          </div>
        ) : activeTab === 'empresas' ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Ingeniero de Calidad</p>
                <h1 className="text-base font-semibold text-slate-100">Gestión de Empresas Contratistas</h1>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowEmpresaModal(true)}>
                <Plus className="w-4 h-4" /> Agregar Empresa
              </Button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nombre Empresa</th>
                    <th className="py-3 px-4">RUT / NIT</th>
                    <th className="py-3 px-4">Contacto</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {empresas.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-100">{emp.nombre}</td>
                      <td className="py-3 px-4 font-mono">{emp.rut || 'N/A'}</td>
                      <td className="py-3 px-4">{emp.contacto || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${emp.activo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {emp.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{formatFechaColombia(emp.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showEmpresaModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                  <h3 className="text-base font-bold text-slate-100">Nueva Empresa Contratista</h3>
                  <form onSubmit={handleCrearEmpresa} className="space-y-3">
                    <Input
                      label="Nombre de la Empresa *"
                      value={empresaNombre}
                      onChange={(e) => setEmpresaNombre(e.target.value)}
                      placeholder="Ej. Transporte Minero S.A.S."
                      required
                    />
                    <Input
                      label="RUT / NIT"
                      value={empresaRut}
                      onChange={(e) => setEmpresaRut(e.target.value)}
                      placeholder="900123456-1"
                    />
                    <Input
                      label="Persona de Contacto"
                      value={empresaContacto}
                      onChange={(e) => setEmpresaContacto(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="secondary" onClick={() => setShowEmpresaModal(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" variant="primary">
                        Guardar Empresa
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <h1 className="text-base font-semibold text-slate-100">Vehículos Inspeccionados</h1>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">Marca / Modelo / Año</th>
                    <th className="py-3 px-4">Último Km</th>
                    <th className="py-3 px-4">Inspecciones</th>
                    <th className="py-3 px-4">Última Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vehiculos.map((v) => (
                    <tr key={v.placa} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">{v.placa}</td>
                      <td className="py-3 px-4">{v.marca} {v.modelo} ({v.año})</td>
                      <td className="py-3 px-4">{v.kilometraje} Km</td>
                      <td className="py-3 px-4 font-bold text-blue-400">{v.total_inspecciones}</td>
                      <td className="py-3 px-4 font-mono">{formatFechaColombia(v.ultima_fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
};

export const JefeInspeccionDashboard = IngenieroDashboard;
export const GerenteDashboard = IngenieroDashboard;
