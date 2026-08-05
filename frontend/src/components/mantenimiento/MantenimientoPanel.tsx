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
import { PlusCircle, RefreshCw } from 'lucide-react';

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

  // Manejar apertura de modal de creación
  const handleOpenCreate = () => {
    if (vehiculos.length > 0) {
      setSelectedVehiculoId(vehiculos[0].id);
    }
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
      setToast({ message: `El kilometraje (${kmNum} km) no puede ser menor al actual (${veh.kilometraje_actual} km).`, type: 'error' });
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
    <div className="space-y-4">
      <ToastNotification message={toast?.message || null} type={toast?.type || 'success'} onClose={() => setToast(null)} />

      {/* Header editorial */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[#111827]">Gestión de Mantenimientos</h1>
          <p className="text-sm text-[#6B7280]">
            Control de mantenimientos preventivos y correctivos de la flota.
          </p>
        </div>
        {role === 'coordinador' && (
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <PlusCircle className="w-3.5 h-3.5" /> Nueva orden
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Select
            label="Vehículo"
            value={filterVehiculoId}
            onChange={(e) => setFilterVehiculoId(e.target.value)}
            options={[
              { value: '', label: 'Todos los vehículos' },
              ...vehiculos.map(v => ({ value: v.id, label: `${v.patente} — ${v.marca} ${v.modelo}` }))
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            label="Estado"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'en_progreso', label: 'En progreso' },
              { value: 'completado', label: 'Completado' },
              { value: 'vencido', label: 'Vencido' }
            ]}
          />
        </div>
        <div className="w-44">
          <Select
            label="Tipo"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            options={[
              { value: '', label: 'Todos los tipos' },
              { value: 'preventivo', label: 'Preventivo' },
              { value: 'correctivo', label: 'Correctivo' }
            ]}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tabla de Mantenimientos */}
      <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF]">Cargando órdenes de mantenimiento...</div>
        ) : mantenimientos.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9CA3AF]">
            No se encontraron órdenes de mantenimiento registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-industrial">
              <thead>
                <tr>
                  <th>Vehículo</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Fecha Límite</th>
                  <th>Kilometraje</th>
                  <th>Estado</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.map((m) => {
                  const veh = vehiculos.find(v => v.id === m.vehiculo_id);
                  return (
                    <tr key={m.id}>
                      <td className="font-semibold text-xs text-[#111827]">
                        {m.vehiculo_patente ? `${m.vehiculo_modelo} (${m.vehiculo_patente})` : m.vehiculo_id}
                      </td>
                      <td className="text-xs uppercase tracking-wide text-[#6B7280] font-mono">
                        {m.tipo}
                      </td>
                      <td className="text-xs text-[#111827]">{m.descripcion}</td>
                      <td className="font-mono text-xs text-[#6B7280]">
                        {new Date(m.fecha_limite).toLocaleDateString('es-CO')}
                      </td>
                      <td className="font-mono text-xs">
                        {m.kilometraje_al_crear.toLocaleString('es-CO')} km
                        {m.kilometraje_al_completar && ` → ${m.kilometraje_al_completar.toLocaleString('es-CO')} km`}
                      </td>
                      <td>
                        {m.estado === 'completado' && <Badge variant="apto">Completado</Badge>}
                        {m.estado === 'en_progreso' && <Badge variant="revision">En progreso</Badge>}
                        {m.estado === 'vencido' && <Badge variant="no_apto">Vencido</Badge>}
                        {m.estado === 'pendiente' && <Badge variant="regular">Pendiente</Badge>}
                      </td>
                      <td className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVehiculoHistorial(veh || { id: m.vehiculo_id, patente: m.vehiculo_patente || 'N/A', marca: m.vehiculo_modelo || '', modelo: '', año: 2024, kilometraje_actual: m.kilometraje_al_crear, estado: 'activo' })}
                        >
                          Historial
                        </Button>

                        {role === 'coordinador' && m.estado === 'pendiente' && (
                          <Button variant="secondary" size="sm" onClick={() => handleStartMantenimiento(m)}>
                            Iniciar
                          </Button>
                        )}

                        {role === 'coordinador' && (m.estado === 'pendiente' || m.estado === 'en_progreso' || m.estado === 'vencido') && (
                          <Button variant="primary" size="sm" onClick={() => handleOpenComplete(m)}>
                            Completar
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
        <form onSubmit={handlePreSubmitCreate} className="space-y-3 text-xs">
          <Select
            label="Vehículo Asignado"
            value={selectedVehiculoId}
            onChange={(e) => setSelectedVehiculoId(e.target.value)}
            options={vehiculos.map(v => ({ value: v.id, label: `${v.patente} — ${v.marca} ${v.modelo} (${v.kilometraje_actual.toLocaleString('es-CO')} km)` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipo de Mantenimiento"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'preventivo' | 'correctivo')}
              options={[
                { value: 'preventivo', label: 'Preventivo' },
                { value: 'correctivo', label: 'Correctivo' }
              ]}
            />

            <div>
              <Input
                label="Fecha Límite"
                type="date"
                required
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <Input
            label="Mantenimiento a Realizar"
            required
            placeholder="Ej. Cambio de pastillas de freno y aceite..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />

          {selectedVehiculo && (
            <div className="p-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-container flex items-center justify-between text-xs">
              <span className="text-[#6B7280]">Kilometraje actual:</span>
              <span className="font-mono font-semibold text-[#111827]">{selectedVehiculo.kilometraje_actual.toLocaleString('es-CO')} km</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-[#374151] block mb-1">Observaciones</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-input text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F]"
              placeholder="Instrucciones adicionales..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Continuar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación Crear Orden */}
      <ConfirmDialog
        isOpen={showConfirmCreate}
        onClose={() => setShowConfirmCreate(false)}
        onConfirm={handleConfirmCreate}
        title="Confirmar Orden de Mantenimiento"
        message={`¿Confirma programar el mantenimiento ${tipo.toUpperCase()} (${descripcion}) para el vehículo ${selectedVehiculo?.patente || ''} con fecha límite ${fechaLimite}?`}
        confirmText="Crear Orden"
        variant="default"
        isLoading={isSubmitting}
      />

      {/* Modal Completar Mantenimiento */}
      <Modal isOpen={!!completingMantenimiento} onClose={() => setCompletingMantenimiento(null)} title="Registrar Mantenimiento Completado">
        {completingMantenimiento && (
          <form onSubmit={handlePreSubmitComplete} className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-container space-y-1">
              <div className="flex justify-between font-semibold text-[#111827]">
                <span>{completingMantenimiento.descripcion}</span>
                <Badge variant="regular">{completingMantenimiento.tipo}</Badge>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Vehículo: {completingMantenimiento.vehiculo_patente} | Fecha Límite: {new Date(completingMantenimiento.fecha_limite).toLocaleDateString('es-CO')}
              </p>
            </div>

            <Input
              label="Kilometraje Actual al Realizar Mantenimiento"
              type="number"
              required
              value={kmCompletar}
              onChange={(e) => setKmCompletar(e.target.value)}
              placeholder="Ej. 45200"
            />

            <div>
              <label className="text-xs font-medium text-[#374151] block mb-1">Notas de Cierre</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-input text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F]"
                placeholder="Detalle de trabajos realizados, repuestos cambiados..."
                value={obsCompletar}
                onChange={(e) => setObsCompletar(e.target.value)}
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[#E5E7EB]">
              <Button type="button" variant="secondary" size="sm" onClick={() => setCompletingMantenimiento(null)}>
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
        message={`¿Confirma registrar la finalización del mantenimiento (${completingMantenimiento?.descripcion}) marcando el nuevo kilometraje del vehículo en ${kmCompletar} km?`}
        confirmText="Marcar Completado"
        variant="default"
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
