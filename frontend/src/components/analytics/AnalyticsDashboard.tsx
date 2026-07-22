import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { KpiResumen } from '../../types';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ToastNotification } from '../ui/ToastNotification';
import { BarChart3, TrendingUp, CheckCircle2, Truck, Wrench, ShieldAlert, RefreshCw } from 'lucide-react';


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

  const COLORS_PIE = ['#10B981', '#EF4444']; // Apto verde, No apto rojo

  const pieData = kpis ? [
    { name: 'APTO', value: kpis.inspecciones_apto },
    { name: 'NO APTO', value: kpis.inspecciones_no_apto }
  ] : [];

  return (
    <div className="space-y-6">
      <ToastNotification message={toast?.message || null} type={toast?.type || 'success'} onClose={() => setToast(null)} />

      {/* Header */}
      <div className="bg-white p-4 border border-border rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand" /> Dashboard Analítico Gerencial (EDA)
          </h2>
          <p className="text-xs text-secondary-text mt-0.5">
            Métricas clave de desempeño operacionales, estado de flota y mantenimiento predictivo.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="px-3 py-1.5 bg-white border border-border hover:bg-gray-50 text-xs font-medium rounded-button transition-colors flex items-center gap-1.5 text-secondary-text"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar Datos
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm text-secondary-tertiary">Cargando métricas y gráficos analíticos...</div>
      ) : (
        <>
          {/* KPI Cards Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 border border-border rounded-card space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary-text">Tasa de Aptitud Flota</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-container">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-primary">{kpis?.tasa_aptitud || 0}%</h3>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Operativa
                </span>
              </div>
              <p className="text-[11px] text-secondary-tertiary">
                {kpis?.inspecciones_apto || 0} aptas de {kpis?.total_inspecciones || 0} inspecciones totales
              </p>
            </div>

            <div className="bg-white p-4 border border-border rounded-card space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary-text">Vehículos en Registro</span>
                <div className="p-2 bg-blue-50 text-brand rounded-container">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-primary">{kpis?.total_vehiculos || 0}</h3>
              <p className="text-[11px] text-secondary-tertiary">Unidades activas monitoreadas</p>
            </div>

            <div className="bg-white p-4 border border-border rounded-card space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary-text">Mantenimientos Pendientes</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-container">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-amber-700">{kpis?.mantenimientos_pendientes || 0}</h3>
              <p className="text-[11px] text-secondary-tertiary">Órdenes activas en taller / terreno</p>
            </div>

            <div className="bg-white p-4 border border-border rounded-card space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-secondary-text">Mantenimientos Vencidos</span>
                <div className="p-2 bg-red-50 text-red-700 rounded-container">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-red-600">{kpis?.mantenimientos_vencidos || 0}</h3>
              <p className="text-[11px] text-red-500 font-semibold">Requieren atención inmediata</p>
            </div>
          </div>

          {/* Fila 1 de Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AreaChart: Tendencia */}
            <div className="lg:col-span-2 bg-white p-5 border border-border rounded-card space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-primary border-b border-border pb-2">
                Tendencia Mensual de Inspecciones Realizadas
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendenciaMeses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="total" name="Total Inspecciones" stroke="#2563EB" fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="aptos" name="Inspecciones Aptas" stroke="#10B981" fillOpacity={1} fill="url(#colorApto)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PieChart: Proporción Apto vs No Apto */}
            <div className="bg-white p-5 border border-border rounded-card space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-primary border-b border-border pb-2">
                Proporción Dictamen General
              </h4>
              <div className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2 de Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BarChart: Ítems más fallados */}
            <div className="bg-white p-5 border border-border rounded-card space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-primary border-b border-border pb-2">
                Top Ítems del Checklist con Mayor Falla (Malo / Regular)
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={itemsProblematicos} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <YAxis dataKey="item" type="category" tick={{ fontSize: 10, fill: '#111827' }} width={100} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="fallas" name="Total Evaluaciones Malas/Regulares" fill="#EF4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BarChart: Top vehículos inspeccionados */}
            <div className="bg-white p-5 border border-border rounded-card space-y-4 shadow-xs">
              <h4 className="text-xs font-bold text-primary border-b border-border pb-2">
                Top Vehículos con Mayor Frecuencia de Inspección
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topVehiculos} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="vehiculo" tick={{ fontSize: 9, fill: '#6B7280' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="total_inspecciones" name="Total Inspecciones" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BarChart: Mantenimientos por Estado */}
            <div className="bg-white p-5 border border-border rounded-card space-y-4 shadow-xs md:col-span-2">
              <h4 className="text-xs font-bold text-primary border-b border-border pb-2">
                Distribución de Mantenimientos por Estado Operacional
              </h4>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mantenimientosEstado} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#111827' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="total" name="Total Órdenes" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
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

