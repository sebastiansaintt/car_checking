import React, { useState, useEffect } from 'react';
import { Mantenimiento, Vehiculo } from '../../types';
import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { HistorialMantenimiento } from './HistorialMantenimiento';
import { ToastNotification } from '../ui/ToastNotification';
import { PlusCircle, Wrench, History, Filter, RefreshCw, CheckCircle2, Clock } from 'lucide-react';


interface MantenimientoPanelProps {
  vehiculos: Vehiculo[];
  role: 'coordinador' | 'gerente';
}

export const MantenimientoPanel: React.FC<MantenimientoPanelProps> = ({ vehiculos, role }) => {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterVehiculoId, setFilterVehiculoId] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Crear
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string>('');
  const [tipo, setTipo] = useState<'preventivo' | 'correctivo'>('preventivo');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fechaLimite, setFechaLimite] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal Confirmación Crear
  const [showConfirmCreate, setShowConfirmCreate] = useState<boolean>(false);

  // Modal Completar
  const [completingMantenimiento, setCompletingMantenimiento] = useState<Mantenimiento | null>(null);
  const [kmCompletar, setKmCompletar] = useState<string>('');
  const [obsCompletar, setObsCompletar] = useState<string>('');
  const [showConfirmComplete, setShowConfirmComplete] = useState<boolean>(false);

  // Modal Historial por Vehículo
  const [selectedVehiculoHistorial, setSelectedVehiculoHistorial] = useState<Vehiculo | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      let endpoint = '/mantenimientos?limit=100';
      const params = new URLSearchParams();
      if (filterVehiculoId) params.append('vehiculo_id', filterVehiculoId);
      if (filterEstado) params.append('estado', filterEstado);
      if (filterTipo) params.append('tipo', filterTipo);

      if (params.toString()) {
        endpoint += `&${params.toString()}`;
      }

      const data = await apiFetch<Mantenimiento[]>(endpoint);
      setMantenimientos(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar mantenimientos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterVehiculoId, filterEstado, filterTipo]);

  // Manejar apertura de modal de creación con km por defecto
  const handleOpenCreate = () => {
    if (vehiculos.length > 0) {
      setSelectedVehiculoId(vehiculos[0].id);
    }
    // Siguiente semana por defecto
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFechaLimite(nextWeek.toISOString().slice(0, 10));
    setTipo('preventivo');
    setDescripcion('');
    setObservaciones('');
    setIsCreateOpen(true);
  };

  const handlePreSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculoId || !descripcion || !fechaLimite) {
      setToast({ message: 'Por favor complete todos los campos requeridos.', type: 'error' });
      return;
    }
    setShowConfirmCreate(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirmCreate(false);
    setIsSubmitting(true);
    try {
      await apiFetch<Mantenimiento>('/mantenimientos', {
        method: 'POST',
        body: JSON.stringify({
          vehiculo_id: selectedVehiculoId,
          tipo,
          descripcion,
          fecha_limite: fechaLimite,
          observaciones
        })
      });


      setToast({ message: 'Orden de mantenimiento creada exitosamente.', type: 'success' });
      setIsCreateOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la orden de mantenimiento';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar inicio de mantenimiento
  const handleStartMantenimiento = async (m: Mantenimiento) => {
    try {
      await apiFetch<Mantenimiento>(`/mantenimientos/${m.id}`, {
        method: 'PUT',
        body: JSON.stringify({ estado: 'en_progreso' })
      });
      setToast({ message: 'Mantenimiento marcado EN PROGRESO.', type: 'success' });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el estado';
      setToast({ message: msg, type: 'error' });
    }
  };

  // Manejar apertura de modal para completar mantenimiento
  const handleOpenComplete = (m: Mantenimiento) => {
    const veh = vehiculos.find(v => v.id === m.vehiculo_id);
    setCompletingMantenimiento(m);
    setKmCompletar(veh ? veh.kilometraje_actual.toString() : '');
    setObsCompletar('');
  };

  const handlePreSubmitComplete = (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = parseInt(kmCompletar, 10);
    const veh = vehiculos.find(v => v.id === completingMantenimiento?.vehiculo_id);
    
    if (isNaN(kmNum) || kmNum < 0) {
      setToast({ message: 'Ingrese un kilometraje válido.', type: 'error' });
      return;
    }
    if (veh && kmNum < veh.kilometraje_actual) {
      setToast({ message: `El kilometraje (${kmNum} Km) no puede ser menor al actual (${veh.kilometraje_actual} Km).`, type: 'error' });
      return;
    }
    setShowConfirmComplete(true);
  };

  const handleConfirmComplete = async () => {
    if (!completingMantenimiento) return;
    setShowConfirmComplete(false);
    setIsSubmitting(true);
    try {
      await apiFetch<Mantenimiento>(`/mantenimientos/${completingMantenimiento.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          estado: 'completado',
          kilometraje_al_completar: parseInt(kmCompletar, 10),
          observaciones: obsCompletar
        })
      });
      setToast({ message: 'Mantenimiento registrado como COMPLETADO.', type: 'success' });
      setCompletingMantenimiento(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el cierre de mantenimiento';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehiculo = vehiculos.find(v => v.id === selectedVehiculoId);

  return (
    <div className="space-y-6">
      <ToastNotification message={toast?.message || null} type={toast?.type || 'success'} onClose={() => setToast(null)} />

      {/* Header y Acción Principal */}
      <div className="bg-white p-4 border border-border rounded-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            <Wrench className="w-5 h-5 text-brand" /> Gestión de Mantenimientos
          </h2>
          <p className="text-xs text-secondary-text mt-0.5">
            Control de mantenimientos preventivos y correctivos de la flota vehicular.
          </p>
        </div>
        {role === 'coordinador' && (
          <Button variant="primary" size="md" onClick={handleOpenCreate}>
            <PlusCircle className="w-4 h-4" /> Crear Orden de Mantenimiento
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 border border-border rounded-card space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Filter className="w-4 h-4 text-secondary-text" /> Filtros de Búsqueda
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Vehículo"
            value={filterVehiculoId}
            onChange={(e) => setFilterVehiculoId(e.target.value)}
            options={[
              { value: '', label: 'Todos los vehículos' },
              ...vehiculos.map(v => ({ value: v.id, label: `${v.patente} — ${v.marca} ${v.modelo}` }))
            ]}
          />
          <Select
            label="Estado"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'en_progreso', label: 'En Progreso' },
              { value: 'completado', label: 'Completados' },
              { value: 'vencido', label: 'Vencidos' }
            ]}
          />
          <Select
            label="Tipo de Mantenimiento"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'preventivo', label: 'Preventivo' },
              { value: 'correctivo', label: 'Correctivo' }
            ]}
          />
        </div>
      </div>

      {/* Tabla de Mantenimientos */}
      <div className="bg-white border border-border rounded-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-secondary-tertiary">Cargando órdenes de mantenimiento...</div>
        ) : mantenimientos.length === 0 ? (
          <div className="p-12 text-center text-sm text-secondary-text">
            No se encontraron órdenes de mantenimiento registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-border text-secondary-text font-medium">
                <tr>
                  <th className="py-3 px-4">Vehículo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Descripción Mantenimiento</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4">Km Inicial → Cierre</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mantenimientos.map((m) => {
                  const veh = vehiculos.find(v => v.id === m.vehiculo_id);
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-primary">
                        {m.vehiculo_patente ? `${m.vehiculo_modelo} (${m.vehiculo_patente})` : m.vehiculo_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.tipo === 'preventivo' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-primary font-medium">{m.descripcion}</td>
                      <td className="py-3 px-4 font-mono text-secondary-text">
                        {new Date(m.fecha_limite).toLocaleDateString('es-CL')}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {m.kilometraje_al_crear.toLocaleString('es-CL')} Km
                        {m.kilometraje_al_completar && ` → ${m.kilometraje_al_completar.toLocaleString('es-CL')} Km`}
                      </td>
                      <td className="py-3 px-4">
                        {m.estado === 'completado' && <Badge variant="apto">COMPLETADO</Badge>}
                        {m.estado === 'en_progreso' && <Badge variant="regular">EN PROGRESO</Badge>}
                        {m.estado === 'vencido' && <Badge variant="no_apto">VENCIDO</Badge>}
                        {m.estado === 'pendiente' && <Badge variant="regular">PENDIENTE</Badge>}

                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedVehiculoHistorial(veh || { id: m.vehiculo_id, patente: m.vehiculo_patente || 'N/A', marca: m.vehiculo_modelo || '', modelo: '', año: 2024, kilometraje_actual: m.kilometraje_al_crear, estado: 'activo' })}
                        >
                          <History className="w-3.5 h-3.5" /> Timeline
                        </Button>

                        {role === 'coordinador' && m.estado === 'pendiente' && (
                          <Button variant="outline" size="sm" onClick={() => handleStartMantenimiento(m)}>
                            <Clock className="w-3.5 h-3.5" /> Iniciar
                          </Button>
                        )}

                        {role === 'coordinador' && (m.estado === 'pendiente' || m.estado === 'en_progreso' || m.estado === 'vencido') && (
                          <Button variant="primary" size="sm" onClick={() => handleOpenComplete(m)}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Orden */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Crear Orden de Mantenimiento">
        <form onSubmit={handlePreSubmitCreate} className="space-y-4 text-xs">
          <Select
            label="Vehículo Asignado"
            value={selectedVehiculoId}
            onChange={(e) => setSelectedVehiculoId(e.target.value)}
            options={vehiculos.map(v => ({ value: v.id, label: `${v.patente} — ${v.marca} ${v.modelo} (${v.kilometraje_actual.toLocaleString('es-CL')} Km)` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo de Mantenimiento"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'preventivo' | 'correctivo')}
              options={[
                { value: 'preventivo', label: 'Preventivo (Rutina)' },
                { value: 'correctivo', label: 'Correctivo (Reparación)' }
              ]}
            />

            <div>
              <label className="text-xs font-medium text-primary block mb-1">Fecha Límite</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 text-xs bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <Input
            label="Mantenimiento a Realizar"
            required
            placeholder="Ej: Cambio de pastillas de freno y cambio de aceite de motor"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          {selectedVehiculo && (
            <div className="p-3 bg-surface-subtle border border-border rounded-input flex items-center justify-between text-xs">
              <span className="text-secondary-text">Kilometraje actual registrado:</span>
              <span className="font-mono font-bold text-primary">{selectedVehiculo.kilometraje_actual.toLocaleString('es-CL')} Km</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-primary block mb-1">Observaciones Adicionales (Opcional)</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Instrucciones especiales para el taller o mecánico..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Continuar a Confirmar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación Crear Orden */}
      <ConfirmDialog
        isOpen={showConfirmCreate}
        onClose={() => setShowConfirmCreate(false)}
        onConfirm={handleConfirmCreate}
        title="Confirmar Creación de Orden de Mantenimiento"
        message={`¿Confirma programar el mantenimiento ${tipo.toUpperCase()} (${descripcion}) para el vehículo ${selectedVehiculo?.patente || ''} con fecha límite ${fechaLimite}?`}
        confirmText="Sí, Crear Orden"
        variant="info"
        isLoading={isSubmitting}
      />

      {/* Modal Completar Mantenimiento */}
      <Modal isOpen={!!completingMantenimiento} onClose={() => setCompletingMantenimiento(null)} title="Registrar Mantenimiento Completado">
        {completingMantenimiento && (
          <form onSubmit={handlePreSubmitComplete} className="space-y-4 text-xs">
            <div className="p-3 bg-surface-subtle border border-border rounded-input space-y-1.5">
              <div className="flex justify-between font-semibold text-primary">
                <span>{completingMantenimiento.descripcion}</span>
                <span className="uppercase text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">{completingMantenimiento.tipo}</span>
              </div>
              <p className="text-[11px] text-secondary-text">
                Vehículo: {completingMantenimiento.vehiculo_patente} | Fecha Límite: {new Date(completingMantenimiento.fecha_limite).toLocaleDateString('es-CL')}
              </p>
            </div>

            <Input
              label="Kilometraje Actual del Vehículo al Realizar Mantenimiento"
              type="number"
              required
              value={kmCompletar}
              onChange={(e) => setKmCompletar(e.target.value)}
              placeholder="Ej: 45200"
            />

            <div>
              <label className="text-xs font-medium text-primary block mb-1">Notas de Cierre de Mantenimiento</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Detalle de trabajos realizados, repuestos cambiados o boletas..."
                value={obsCompletar}
                onChange={(e) => setObsCompletar(e.target.value)}
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setCompletingMantenimiento(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Guardar Cierre
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmación Cierre Mantenimiento */}
      <ConfirmDialog
        isOpen={showConfirmComplete}
        onClose={() => setShowConfirmComplete(false)}
        onConfirm={handleConfirmComplete}
        title="Confirmar Cierre de Mantenimiento"
        message={`¿Confirma registrar la finalización del mantenimiento (${completingMantenimiento?.descripcion}) marcando el nuevo kilometraje del vehículo en ${kmCompletar} Km?`}
        confirmText="Sí, Marcar Completado"
        variant="success"
        isLoading={isSubmitting}
      />

      {/* Timeline Modal */}
      <HistorialMantenimiento
        isOpen={!!selectedVehiculoHistorial}
        onClose={() => setSelectedVehiculoHistorial(null)}
        vehiculo={selectedVehiculoHistorial}
        mantenimientos={mantenimientos}
      />
    </div>
  );
};
