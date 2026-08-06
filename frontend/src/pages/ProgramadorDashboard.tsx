import React, { useState, useEffect } from 'react';
import { Inspeccion, VehiculoInspeccionado, Notificacion } from '../types';
import { apiFetch } from '../lib/api';
import { AppShell } from '../components/ui/AppShell';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import { HistorialConArbol } from '../components/inspeccion/HistorialConArbol';
import { InspeccionDetailModal } from '../components/inspeccion/InspeccionDetailModal';
import { PlanillaPDF } from '../components/inspeccion/PlanillaPDF';
import { formatFechaColombia } from '../lib/dateUtils';
import { ClipboardList, Bell, Truck } from 'lucide-react';

type Tab = 'inspecciones' | 'notificaciones' | 'vehiculos';

export const ProgramadorDashboard: React.FC = () => {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoInspeccionado[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('inspecciones');
  const [loading, setLoading] = useState<boolean>(true);

  // Modales
  const [selectedInspeccion, setSelectedInspeccion] = useState<Inspeccion | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [pdfInspeccion, setPdfInspeccion] = useState<Inspeccion | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [iData, vData, nData] = await Promise.all([
        apiFetch<Inspeccion[]>('/inspecciones'),
        apiFetch<VehiculoInspeccionado[]>('/inspecciones/vehiculos-inspeccionados'),
        apiFetch<Notificacion[]>('/notificaciones'),
      ]);
      setInspecciones(iData);
      setVehiculos(vData);
      setNotificaciones(nData);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleVerInspeccion = (ins: Inspeccion) => {
    setSelectedInspeccion(ins);
    setShowDetailModal(true);
  };

  const handleDescargarPDF = (ins: Inspeccion) => {
    setPdfInspeccion(ins);
  };

  const navItems = [
    { id: 'inspecciones', label: `Inspecciones (${inspecciones.length})`, icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'notificaciones', label: `Pendientes / Notif (${notificaciones.filter(n => !n.leida).length})`, icon: <Bell className="w-4 h-4" /> },
    { id: 'vehiculos', label: `Vehículos (${vehiculos.length})`, icon: <Truck className="w-4 h-4" /> },
  ];

  return (
    <>
      <InspeccionDetailModal
        isOpen={showDetailModal}
        inspeccion={selectedInspeccion}
        userRol="programador"
        onClose={() => setShowDetailModal(false)}
        onDescargarPDF={handleDescargarPDF}
      />

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
        ) : activeTab === 'inspecciones' ? (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Programador de Operaciones</p>
              <h1 className="text-base font-semibold text-[#111827]">Historial Completo de Inspecciones</h1>
            </div>
            <HistorialConArbol
              inspecciones={inspecciones}
              userRol="programador"
              onVer={handleVerInspeccion}
              onDescargarPDF={handleDescargarPDF}
            />
          </div>
        ) : activeTab === 'notificaciones' ? (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Programador de Operaciones</p>
              <h1 className="text-base font-semibold text-[#111827]">Notificaciones y Novedades</h1>
            </div>
            <div className="space-y-2">
              {notificaciones.length === 0 ? (
                <div className="border border-[#E5E7EB] bg-white rounded-container p-8 text-center text-[#6B7280]">
                  No tienes notificaciones pendientes.
                </div>
              ) : (
                notificaciones.map((n) => (
                  <div key={n.id} className="bg-white border border-[#E5E7EB] p-4 rounded-container flex items-start justify-between shadow-sm">
                    <div>
                      <h4 className="font-bold text-sm text-[#111827]">{n.titulo}</h4>
                      <p className="text-xs text-[#6B7280] mt-1">{n.mensaje}</p>
                      <span className="text-[10px] text-[#9CA3AF] font-mono mt-2 block">{formatFechaColombia(n.created_at)}</span>
                    </div>
                    {!n.leida && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-bold border border-amber-200">
                        No Leída
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-[#9CA3AF] font-medium mb-1">Programador de Operaciones</p>
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
