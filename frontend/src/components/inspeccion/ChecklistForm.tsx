import React, { useState } from 'react';
import { Vehiculo, CatalogoItem, Inspeccion } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { DigitalSignature } from '../ui/DigitalSignature';
import { apiFetch, API_BASE_URL } from '../../lib/api';
import { generateUUID } from '../../lib/offlineQueue';
import { CheckCircle2, AlertTriangle, XCircle, Camera, Upload, ArrowLeft } from 'lucide-react';

interface ChecklistFormProps {
  vehiculos: Vehiculo[];
  catalogo: CatalogoItem[];
  onSuccess: (inspeccion: Inspeccion) => void;
  onCancel?: () => void;
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({ vehiculos, catalogo, onSuccess, onCancel }) => {
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string>(vehiculos[0]?.id || '');
  const selectedVehiculo = vehiculos.find(v => v.id === selectedVehiculoId);
  
  const [kilometraje, setKilometraje] = useState<number>(selectedVehiculo ? selectedVehiculo.kilometraje_actual : 0);
  const [resultadoGeneral, setResultadoGeneral] = useState<'apto' | 'no_apto'>('apto');
  const [tipoMantenimiento, setTipoMantenimiento] = useState<'preventivo' | 'correctivo' | ''>('');
  const [fechaLimiteMantenimiento, setFechaLimiteMantenimiento] = useState<string>('');
  const [detalleMantenimiento, setDetalleMantenimiento] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [firmaUrl, setFirmaUrl] = useState<string>('');
  
  // Mapeo de evaluaciones de items
  const [itemsEvaluation, setItemsEvaluation] = useState<Record<string, 'bueno' | 'regular' | 'malo'>>(
    catalogo.reduce((acc, item) => ({ ...acc, [item.id]: 'bueno' }), {})
  );

  // Evidencias cargadas
  const [evidencias, setEvidencias] = useState<{ url: string; checklist_item_id?: string; descripcion?: string }[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVehiculoChange = (id: string) => {
    setSelectedVehiculoId(id);
    const v = vehiculos.find(veh => veh.id === id);
    if (v) setKilometraje(v.kilometraje_actual);
  };

  const handleItemValueChange = (catalogoId: string, valor: 'bueno' | 'regular' | 'malo') => {
    setItemsEvaluation(prev => ({ ...prev, [catalogoId]: valor }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Pedir presigned URL
      const presignedRes = await apiFetch<{ upload_url: string; file_url: string }>('/inspecciones/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name }),
      });

      // 2. Subir archivo al endpoint simulado de S3
      const formData = new FormData();
      formData.append('file', file);

      const targetUploadUrl = presignedRes.upload_url.startsWith('http')
        ? presignedRes.upload_url
        : `${API_BASE_URL.replace(/\/api$/, '')}${presignedRes.upload_url}`;

      await fetch(targetUploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      // 3. Agregar a la lista de evidencias
      setEvidencias(prev => [
        ...prev,
        {
          url: presignedRes.file_url,
          checklist_item_id: itemId,
          descripcion: `Evidencia de ${file.name}`
        }
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir la evidencia fotográfica';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedVehiculo) {
      setErrorMsg('Debe seleccionar un vehículo.');
      return;
    }

    if (kilometraje < selectedVehiculo.kilometraje_actual) {
      setErrorMsg(`El kilometraje ingresado (${kilometraje} Km) no puede ser menor al actual (${selectedVehiculo.kilometraje_actual} Km).`);
      return;
    }

    if (!firmaUrl) {
      setErrorMsg('La firma digital del coordinador es requerida.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Construir recomendación de mantenimiento estructurada
      let mantenimientoFinal: string | undefined = undefined;
      if (tipoMantenimiento || detalleMantenimiento || fechaLimiteMantenimiento) {
        const tipoStr = tipoMantenimiento ? `[${tipoMantenimiento.toUpperCase()}] ` : '';
        const fechaStr = fechaLimiteMantenimiento ? ` (Límite: ${fechaLimiteMantenimiento})` : '';
        mantenimientoFinal = `${tipoStr}${detalleMantenimiento}${fechaStr}`.trim();
      }

      const payload = {
        vehiculo_id: selectedVehiculoId,
        kilometraje: Number(kilometraje),
        resultado_general: resultadoGeneral,
        mantenimiento_recomendado: mantenimientoFinal,
        firma_url: firmaUrl,
        observaciones: observaciones || undefined,
        checklist_items: Object.entries(itemsEvaluation).map(([catalogo_id, valor]) => ({
          catalogo_id,
          valor
        })),
        evidencias: evidencias
      };

      const idempotencyKey = generateUUID();

      // Si el usuario está offline, guardar en la cola de IndexedDB
      if (!navigator.onLine) {
        const { saveOfflineInspeccion } = await import('../../lib/offlineQueue');
        await saveOfflineInspeccion(idempotencyKey, payload);

        // Notificar éxito en cola local
        const offlineMockInspeccion: Inspeccion = {
          id: idempotencyKey,
          vehiculo_id: selectedVehiculoId,
          coordinador_id: 'offline-coord',
          fecha: new Date().toISOString(),
          kilometraje: Number(kilometraje),
          resultado_general: resultadoGeneral,
          mantenimiento_recomendado: mantenimientoFinal,
          firma_url: firmaUrl,
          observaciones: observaciones ? `${observaciones} (Pendiente Sincronización Red)` : '(Pendiente Sincronización Red)',
          checklist_items: payload.checklist_items,
          evidencias: payload.evidencias,
          created_at: new Date().toISOString()
        };

        onSuccess(offlineMockInspeccion);
        return;
      }

      // Si está online, enviar directo a la API
      const newInspeccion = await apiFetch<Inspeccion>('/inspecciones', {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      onSuccess(newInspeccion);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la inspección';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Back button */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-xs font-medium text-secondary-text hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Volver al panel principal
        </button>
      )}
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 bg-status-no_apto-bg border border-status-no_apto-border text-status-no_apto-text rounded-input text-sm">
          {errorMsg}
        </div>
      )}

      {/* Sección 1: Selección de Vehículo y Datos Generales */}
      <div className="bg-white p-5 border border-border rounded-card space-y-4">
        <h4 className="text-sm font-semibold text-primary border-b border-border pb-2">1. Datos del Vehículo</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Vehículo"
            value={selectedVehiculoId}
            onChange={(e) => handleVehiculoChange(e.target.value)}
            options={vehiculos.map(v => ({
              value: v.id,
              label: `${v.marca} ${v.modelo} (${v.patente}) — ${v.kilometraje_actual} Km`
            }))}
          />
          <Input
            label="Kilometraje Actual (Km)"
            type="number"
            value={kilometraje}
            onChange={(e) => setKilometraje(Number(e.target.value))}
            min={selectedVehiculo?.kilometraje_actual || 0}
            required
          />
        </div>
      </div>

      {/* Sección 2: Checklist Maestra */}
      <div className="bg-white p-5 border border-border rounded-card space-y-4">
        <div className="flex justify-between items-center border-b border-border pb-2">
          <h4 className="text-sm font-semibold text-primary">2. Evaluación de Ítems ({catalogo.length})</h4>
          <span className="text-xs text-secondary-text">Marque el estado de cada componente</span>
        </div>

        <div className="divide-y divide-border">
          {catalogo.map(item => (
            <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-primary capitalize">{item.nombre}</span>
                {item.descripcion && <p className="text-xs text-secondary-text">{item.descripcion}</p>}
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleItemValueChange(item.id, 'bueno')}
                  className={`px-3 py-1 text-xs font-medium rounded-input border transition-colors flex items-center gap-1 ${
                    itemsEvaluation[item.id] === 'bueno'
                      ? 'bg-status-apto-bg text-status-apto-text border-status-apto-border font-semibold'
                      : 'bg-white text-secondary-text border-border hover:bg-gray-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Bueno
                </button>
                <button
                  type="button"
                  onClick={() => handleItemValueChange(item.id, 'regular')}
                  className={`px-3 py-1 text-xs font-medium rounded-input border transition-colors flex items-center gap-1 ${
                    itemsEvaluation[item.id] === 'regular'
                      ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border font-semibold'
                      : 'bg-white text-secondary-text border-border hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Regular
                </button>
                <button
                  type="button"
                  onClick={() => handleItemValueChange(item.id, 'malo')}
                  className={`px-3 py-1 text-xs font-medium rounded-input border transition-colors flex items-center gap-1 ${
                    itemsEvaluation[item.id] === 'malo'
                      ? 'bg-status-no_apto-bg text-status-no_apto-text border-status-no_apto-border font-semibold'
                      : 'bg-white text-secondary-text border-border hover:bg-gray-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" /> Malo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección 3: Resultado, Mantenimiento, Observaciones y Evidencias */}
      <div className="bg-white p-5 border border-border rounded-card space-y-4">
        <h4 className="text-sm font-semibold text-primary border-b border-border pb-2">3. Dictamen y Evidencias</h4>
        
        <Select
          label="Resultado General de Inspección"
          value={resultadoGeneral}
          onChange={(e) => setResultadoGeneral(e.target.value as 'apto' | 'no_apto')}
          options={[
            { value: 'apto', label: 'APTO (Operativo)' },
            { value: 'no_apto', label: 'NO APTO (Requiere Mantención/Inmovilización)' }
          ]}
        />

        {/* Mantenimiento estructurado */}
        <div className="border border-border rounded-input p-4 space-y-3 bg-surface-subtle">
          <h5 className="text-xs font-semibold text-primary">Planificación de Mantenimiento (Opcional)</h5>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Tipo de Mantenimiento"
              value={tipoMantenimiento}
              onChange={(e) => setTipoMantenimiento(e.target.value as 'preventivo' | 'correctivo' | '')}
              options={[
                { value: '', label: 'Seleccionar tipo...' },
                { value: 'preventivo', label: 'Preventivo (Rutina / Programado)' },
                { value: 'correctivo', label: 'Correctivo (Reparación Urgente)' }
              ]}
            />
            <Input
              label="Fecha Límite de Realización"
              type="date"
              value={fechaLimiteMantenimiento}
              onChange={(e) => setFechaLimiteMantenimiento(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-primary block mb-1">
              Detalle del Mantenimiento (ej: frenos, llantas, luces)
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Describa el mantenimiento requerido y los componentes a intervenir..."
              value={detalleMantenimiento}
              onChange={(e) => setDetalleMantenimiento(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-primary block mb-1">Observaciones Generales</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 text-sm bg-white border border-border rounded-input text-primary focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Detalles sobre hallazgos o comentarios del vehículo..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {/* Subida de Evidencia Fotográfica con opciones Cámara y Galería */}
        <div className="border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-primary">Evidencias Fotográficas ({evidencias.length})</span>
            <div className="flex items-center gap-2">
              {/* Botón Tomar Foto (Cámara en dispositivos móviles) */}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle text-primary border border-border rounded-input text-xs font-medium hover:bg-gray-100 transition-colors">
                <Camera className="w-3.5 h-3.5" />
                {isUploading ? 'Cargando...' : 'Tomar Foto'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>

              {/* Botón Seleccionar de Galería */}
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle text-primary border border-border rounded-input text-xs font-medium hover:bg-gray-100 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Galería
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {evidencias.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {evidencias.map((ev, idx) => (
                <div key={idx} className="relative group border border-border rounded-input overflow-hidden bg-gray-50 aspect-video">
                  <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    Foto #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sección 4: Firma Digital y Envío */}
      <div className="bg-white p-5 border border-border rounded-card space-y-4">
        <h4 className="text-sm font-semibold text-primary border-b border-border pb-2">4. Firma del Coordinador</h4>
        <DigitalSignature onSave={(dataUrl) => setFirmaUrl(dataUrl)} />
        
        <div className="pt-4 flex justify-end gap-3">
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} disabled={!firmaUrl}>
            <Upload className="w-4 h-4" /> Registrar Inspección
          </Button>
        </div>
      </div>
    </form>
    </div>
  );
};
