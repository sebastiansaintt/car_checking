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
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
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
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Ingeniero de Calidad</p>
              <h1 className="text-base font-semibold text-[#111827]">Cola de Aprobación y Emisión de Sello</h1>
            </div>

            {pendientesAprobacion.length === 0 ? (
              <div className="border border-[#E5E7EB] bg-white rounded-container p-8 text-center text-[#6B7280]">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No hay inspecciones pendientes por aprobación.</p>
              </div>
            ) : (
              <div className="border border-[#E5E7EB] rounded-container overflow-hidden bg-white shadow-sm">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>N° Planilla</th>
                      <th>Fecha</th>
                      <th>Placa</th>
                      <th>Empresa</th>
                      <th>Dictamen</th>
                      <th className="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientesAprobacion.map((ins) => {
                      const esHallazgo = ins.resultado_general === 'con_hallazgos' || ins.resultado_general === 'no_apto';
                      return (
                        <tr key={ins.id}>
                          <td className="font-mono text-xs font-bold text-[#111827]">#{ins.numero_inspeccion}</td>
                          <td className="font-mono text-xs text-[#6B7280]">{formatFechaColombia(ins.fecha)}</td>
                          <td className="font-mono font-bold text-sm text-[#111827] uppercase">{ins.vehiculo_patente || ins.vehiculo?.patente}</td>
                          <td className="text-xs text-[#6B7280]">{ins.empresa_contratista_nombre || 'N/A'}</td>
                          <td>
                            <Badge variant={esHallazgo ? 'no_apto' : 'apto'}>
                              {esHallazgo ? 'Con hallazgos' : 'Aprobado'}
                            </Badge>
                          </td>
                          <td className="text-right">
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'historial' ? (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Ingeniero de Calidad</p>
              <h1 className="text-base font-semibold text-[#111827]">Historial de Inspecciones Técnicas</h1>
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
                <p className="text-xs text-[#9CA3AF] font-medium mb-1">Ingeniero de Calidad</p>
                <h1 className="text-base font-semibold text-[#111827]">Gestión de Empresas Contratistas</h1>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowEmpresaModal(true)}>
                <Plus className="w-4 h-4" /> Agregar Empresa
              </Button>
            </div>

            <div className="border border-[#E5E7EB] rounded-container overflow-hidden bg-white shadow-sm">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Nombre Empresa</th>
                    <th>RUT / NIT</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((emp) => (
                    <tr key={emp.id}>
                      <td className="font-bold text-xs text-[#111827]">{emp.nombre}</td>
                      <td className="font-mono text-xs text-[#6B7280]">{emp.rut || 'N/A'}</td>
                      <td className="text-xs text-[#6B7280]">{emp.contacto || 'N/A'}</td>
                      <td>
                        <Badge variant={emp.activo ? 'apto' : 'neutral'}>
                          {emp.activo ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs text-[#6B7280]">{formatFechaColombia(emp.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Modal
              isOpen={showEmpresaModal}
              onClose={() => setShowEmpresaModal(false)}
              title="Nueva Empresa Contratista"
              maxWidth="max-w-md"
              footer={
                <div className="flex gap-2 justify-end w-full">
                  <Button type="button" variant="secondary" onClick={() => setShowEmpresaModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" form="empresa-form">
                    Guardar Empresa
                  </Button>
                </div>
              }
            >
              <form id="empresa-form" onSubmit={handleCrearEmpresa} className="space-y-3">
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
              </form>
            </Modal>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Ingeniero de Calidad</p>
              <h1 className="text-base font-semibold text-[#111827]">Vehículos Inspeccionados</h1>
            </div>
            <div className="border border-[#E5E7EB] rounded-container overflow-hidden bg-white shadow-sm">
              <table className="table-industrial">
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Marca / Modelo / Año</th>
                    <th>Último Km</th>
                    <th>Inspecciones</th>
                    <th>Última Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculos.map((v) => (
                    <tr key={v.placa}>
                      <td className="font-mono font-bold text-sm text-[#111827] uppercase">{v.placa}</td>
                      <td className="text-xs text-[#374151]">{v.marca} {v.modelo} ({v.año})</td>
                      <td className="text-xs text-[#374151]">{v.kilometraje} Km</td>
                      <td className="font-bold text-xs text-[#1E3A5F]">{v.total_inspecciones}</td>
                      <td className="font-mono text-xs text-[#6B7280]">{formatFechaColombia(v.ultima_fecha)}</td>
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
