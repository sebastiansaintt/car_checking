import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { KpiResumen } from '../../types';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ToastNotification } from '../ui/ToastNotification';
import { Button } from '../ui/Button';
import { RefreshCw } from 'lucide-react';

interface InspeccionMesData {
  mes: string;
  total: number;
  aptos: number;
  no_aptos: number;
}

interface TopVehiculoData {
  vehiculo: string;
  total_inspecciones: number;
}

interface ItemProblematicoData {
  item: string;
  fallas: number;
}

interface MantenimientoEstadoData {
  estado: string;
  total: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KpiResumen | null>(null);
  const [tendenciaMeses, setTendenciaMeses] = useState<InspeccionMesData[]>([]);
  const [topVehiculos, setTopVehiculos] = useState<TopVehiculoData[]>([]);
  const [itemsProblematicos, setItemsProblematicos] = useState<ItemProblematicoData[]>([]);
  const [mantenimientosEstado, setMantenimientosEstado] = useState<MantenimientoEstadoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [kpiRes, tendenciaRes, topRes, itemsRes, mantRes] = await Promise.all([
        apiFetch<KpiResumen>('/estadisticas/kpi-resumen'),
        apiFetch<InspeccionMesData[]>('/estadisticas/inspecciones-por-mes'),
        apiFetch<TopVehiculoData[]>('/estadisticas/top-vehiculos'),
        apiFetch<ItemProblematicoData[]>('/estadisticas/items-problematicos'),
        apiFetch<MantenimientoEstadoData[]>('/estadisticas/mantenimientos-resumen')
      ]);

      setKpis(kpiRes);
      setTendenciaMeses(tendenciaRes);
      setTopVehiculos(topRes);
      setItemsProblematicos(itemsRes);
      setMantenimientosEstado(mantRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar analíticas';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const COLORS_PIE = ['#065F46', '#991B1B']; // Semánticos del design system: Apto verde, No apto rojo

  const pieData = kpis ? [
    { name: 'APTO', value: kpis.inspecciones_apto },
    { name: 'NO APTO', value: kpis.inspecciones_no_apto }
  ] : [];

  return (
    <div className="space-y-5">
      <ToastNotification message={toast?.message || null} type={toast?.type || 'success'} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#111827]">Dashboard Analítico</h1>
          <p className="text-sm text-[#6B7280]">
            Métricas de desempeño operacional, estado de flota y mantenimiento.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadAnalytics}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#9CA3AF]">Cargando analíticas...</div>
      ) : (
        <>
          {/* KPI Indicators - flat layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-1">
              <span className="text-xs text-[#6B7280]">Tasa de Aptitud Flota</span>
              <p className="text-xl font-semibold font-mono text-[#065F46]">{kpis?.tasa_aptitud || 0}%</p>
              <p className="text-[11px] text-[#9CA3AF]">
                {kpis?.inspecciones_apto || 0} aptas de {kpis?.total_inspecciones || 0} totales
              </p>
            </div>

            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-1">
              <span className="text-xs text-[#6B7280]">Vehículos Registrados</span>
              <p className="text-xl font-semibold font-mono text-[#111827]">{kpis?.total_vehiculos || 0}</p>
              <p className="text-[11px] text-[#9CA3AF]">Unidades monitoreadas</p>
            </div>

            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-1">
              <span className="text-xs text-[#6B7280]">Mantenimientos Pendientes</span>
              <p className="text-xl font-semibold font-mono text-[#92400E]">{kpis?.mantenimientos_pendientes || 0}</p>
              <p className="text-[11px] text-[#9CA3AF]">Órdenes en taller / terreno</p>
            </div>

            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-1">
              <span className="text-xs text-[#6B7280]">Mantenimientos Vencidos</span>
              <p className="text-xl font-semibold font-mono text-[#991B1B]">{kpis?.mantenimientos_vencidos || 0}</p>
              <p className="text-[11px] text-[#991B1B]">Atención requerida</p>
            </div>
          </div>

          {/* Fila 1 de Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* AreaChart: Tendencia */}
            <div className="lg:col-span-2 bg-white p-4 border border-[#E5E7EB] rounded-container space-y-3">
              <h4 className="text-xs font-semibold text-[#111827]">
                Tendencia Mensual de Inspecciones
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendenciaMeses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#065F46" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#065F46" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="total" name="Total Inspecciones" stroke="#1E3A5F" fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="aptos" name="Inspecciones Aptas" stroke="#065F46" fillOpacity={1} fill="url(#colorApto)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PieChart: Proporción Apto vs No Apto */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-3">
              <h4 className="text-xs font-semibold text-[#111827]">
                Dictamen General
              </h4>
              <div className="h-56 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2 de Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BarChart: Ítems más fallados */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-3">
              <h4 className="text-xs font-semibold text-[#111827]">
                Ítems con Mayor Falla
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemsProblematicos} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis dataKey="item" type="category" tick={{ fontSize: 10, fill: '#111827' }} width={100} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="fallas" name="Subestándar" fill="#991B1B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BarChart: Top vehículos inspeccionados */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-3">
              <h4 className="text-xs font-semibold text-[#111827]">
                Frecuencia de Inspección por Vehículo
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVehiculos} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="vehiculo" tick={{ fontSize: 9, fill: '#6B7280' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="total_inspecciones" name="Inspecciones" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BarChart: Mantenimientos por Estado */}
            <div className="bg-white p-4 border border-[#E5E7EB] rounded-container space-y-3 md:col-span-2">
              <h4 className="text-xs font-semibold text-[#111827]">
                Mantenimientos por Estado Operacional
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mantenimientosEstado} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#111827' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="total" name="Órdenes" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
