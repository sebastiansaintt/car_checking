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
              <p className="text-xs text-slate-400 font-medium mb-1">Programador de Operaciones</p>
              <h1 className="text-base font-semibold text-slate-100">Historial Completo de Inspecciones</h1>
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
            <h1 className="text-base font-semibold text-slate-100">Notificaciones Recibidas</h1>
            <div className="space-y-2">
              {notificaciones.map((n) => (
                <div key={n.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{n.titulo}</h4>
                    <p className="text-xs text-slate-400 mt-1">{n.mensaje}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-2 block">{formatFechaColombia(n.created_at)}</span>
                  </div>
                  {!n.leida && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      No Leída
                    </span>
                  )}
                </div>
              ))}
            </div>
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
