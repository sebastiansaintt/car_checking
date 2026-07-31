import React, { useState, useEffect } from 'react';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { DigitalSignature } from '../ui/DigitalSignature';
import { SistemaChecklist } from './SistemaChecklist';
import { apiFetch, API_BASE_URL } from '../../lib/api';
import { generateUUID } from '../../lib/offlineQueue';
import { Camera, Upload, ArrowLeft, Plus, Trash2, CheckCircle2, AlertOctagon } from 'lucide-react';

interface ChecklistFormProps {
  sistemas: CatalogoSistema[];
  catalogo: CatalogoItem[];
  empresas: EmpresaContratista[];
  vehiculos?: Vehiculo[];
  initialInspeccionToEdit?: Inspeccion | null;
  onSuccess: (inspeccion: Inspeccion) => void;
  onCancel?: () => void;
}

export const ChecklistForm: React.FC<ChecklistFormProps> = ({
  sistemas,
  catalogo,
  empresas,
  vehiculos = [],
  initialInspeccionToEdit = null,
  onSuccess,
  onCancel
}) => {
  const isEditingMode = !!initialInspeccionToEdit;

  // 1. Datos del Vehículo (Alta dinámica por Placa - ADJ-01)
  const [placa, setPlaca] = useState<string>(initialInspeccionToEdit?.vehiculo_patente || '');
  const [empresaId, setEmpresaId] = useState<string>(initialInspeccionToEdit?.empresa_contratista_id || empresas[0]?.id || '');
  const [marca, setMarca] = useState<string>('Foton');
  const [modelo, setModelo] = useState<string>('2025');
  const [año, setAño] = useState<number>(2025);
  const [tipoVehiculo, setTipoVehiculo] = useState<string>('Camioneta');
  const [numeroInterno, setNumeroInterno] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [equipoAuxiliar, setEquipoAuxiliar] = useState<string>(initialInspeccionToEdit?.equipo_auxiliar || '');
  const [areaTransitar, setAreaTransitar] = useState<string>(initialInspeccionToEdit?.area_transitar || 'Mina / Operaciones');
  const [kilometraje, setKilometraje] = useState<number>(initialInspeccionToEdit?.kilometraje || 0);
  const [horaInspeccion, setHoraInspeccion] = useState<string>(
    initialInspeccionToEdit?.hora_inspeccion || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Auto-completar si la placa ingresada existe en la lista local de vehículos
  useEffect(() => {
    if (!isEditingMode && placa.trim().length >= 3) {
      const match = vehiculos.find(v => v.patente.toUpperCase() === placa.trim().toUpperCase());
      if (match) {
        setMarca(match.marca);
        setModelo(match.modelo);
        setAño(match.año);
        if (match.empresa_contratista_id) setEmpresaId(match.empresa_contratista_id);
        if (match.kilometraje_actual) setKilometraje(match.kilometraje_actual);
        if (match.tipo_vehiculo) setTipoVehiculo(match.tipo_vehiculo);
        if (match.numero_interno) setNumeroInterno(match.numero_interno || '');
      }
    }
  }, [placa, vehiculos, isEditingMode]);

  // 2. Evaluaciones de ítems por sistema (E / S / N/A)
  const [itemsEvaluation, setItemsEvaluation] = useState<
    Record<string, { valor: 'estandar' | 'subestandar' | 'na'; comentario?: string }>
  >(() => {
    if (initialInspeccionToEdit && initialInspeccionToEdit.checklist_items) {
      const initialMap: Record<string, { valor: 'estandar' | 'subestandar' | 'na'; comentario?: string }> = {};
      initialInspeccionToEdit.checklist_items.forEach(ci => {
        const val = ci.valor === 'bueno' ? 'estandar' : ci.valor === 'malo' ? 'subestandar' : (ci.valor as 'estandar' | 'subestandar' | 'na');
        initialMap[ci.catalogo_id] = { valor: val, comentario: ci.comentario };
      });
      return initialMap;
    }
    // Por defecto: todos en 'estandar' (E)
    return catalogo.reduce(
      (acc, item) => ({ ...acc, [item.id]: { valor: 'estandar', comentario: '' } }),
      {}
    );
  });

  // 3. Firmantes adicionales (máx 2 técnicos en texto libre — RN-10)
  const [tecnicosAdicionales, setTecnicosAdicionales] = useState<string[]>([]);
  const [nuevoTecnicoNombre, setNuevoTecnicoNombre] = useState<string>('');

  const handleAddTecnico = () => {
    if (nuevoTecnicoNombre.trim() && tecnicosAdicionales.length < 2) {
      setTecnicosAdicionales([...tecnicosAdicionales, nuevoTecnicoNombre.trim()]);
      setNuevoTecnicoNombre('');
    }
  };

  const handleRemoveTecnico = (idx: number) => {
    setTecnicosAdicionales(tecnicosAdicionales.filter((_, i) => i !== idx));
  };

  // 4. Firma digital del inspector logueado
  const [firmaUrl, setFirmaUrl] = useState<string>(initialInspeccionToEdit?.firmas_tecnicos?.[0]?.firma_url || '');

  // 5. Evidencias fotográficas y Observaciones
  const [observaciones, setObservaciones] = useState<string>(initialInspeccionToEdit?.observaciones || '');
  const [mantenimientoRecomendado, setMantenimientoRecomendado] = useState<string>(initialInspeccionToEdit?.mantenimiento_recomendado || '');
  const [evidencias, setEvidencias] = useState<{ url: string; checklist_item_id?: string; descripcion?: string }[]>([]);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manejo de cambios en ítems
  const handleItemChange = (catalogoId: string, valor: 'estandar' | 'subestandar' | 'na', comentario?: string) => {
    setItemsEvaluation(prev => ({
      ...prev,
      [catalogoId]: { valor, comentario }
    }));
  };

  // Cálculo en tiempo real del dictamen general
  const tieneCualquierSubestandar = Object.values(itemsEvaluation).some(v => v.valor === 'subestandar');

  // Subida de evidencias
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const presignedRes = await apiFetch<{ upload_url: string; file_url: string }>('/inspecciones/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name }),
      });

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

      setEvidencias(prev => [
        ...prev,
        {
          url: presignedRes.file_url,
          checklist_item_id: itemId,
          descripcion: `Evidencia de ${file.name}`
        }
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir evidencia';
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!placa.trim()) {
      setErrorMsg('Debe ingresar la placa del vehículo.');
      return;
    }

    if (!isEditingMode && !firmaUrl) {
      setErrorMsg('La firma digital del técnico de inspección es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const checklistItemsPayload = Object.entries(itemsEvaluation).map(([catalogo_id, item]) => ({
        catalogo_id,
        valor: item.valor,
        comentario: item.comentario
      }));

      // MODO EDICIÓN / RE-INSPECCIÓN EN LA MISMA PLANILLA (RN-07)
      if (isEditingMode && initialInspeccionToEdit) {
        const updatePayload = {
          kilometraje: Number(kilometraje),
          observaciones,
          mantenimiento_recomendado: mantenimientoRecomendado,
          checklist_items: checklistItemsPayload,
          evidencias
        };

        const updatedInspeccion = await apiFetch<Inspeccion>(`/inspecciones/${initialInspeccionToEdit.id}/corregir`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        onSuccess(updatedInspeccion);
        return;
      }

      // MODO CREACIÓN NUEVA INSPECCIÓN
      const payload = {
        placa: placa.trim().toUpperCase(),
        empresa_contratista_id: empresaId || undefined,
        marca,
        modelo,
        año: Number(año),
        tipo_vehiculo: tipoVehiculo,
        numero_interno: numeroInterno || undefined,
        color: color || undefined,
        equipo_auxiliar: equipoAuxiliar || undefined,
        area_transitar: areaTransitar || undefined,
        kilometraje: Number(kilometraje),
        hora_inspeccion: horaInspeccion,
        firma_url: firmaUrl,
        nombres_tecnicos_adicionales: tecnicosAdicionales,
        observaciones: observaciones || undefined,
        mantenimiento_recomendado: mantenimientoRecomendado || undefined,
        checklist_items: checklistItemsPayload,
        evidencias
      };

      const idempotencyKey = generateUUID();

      // Guardado Offline si no hay red (PWA)
      if (!navigator.onLine) {
        const { saveOfflineInspeccion } = await import('../../lib/offlineQueue');
        await saveOfflineInspeccion(idempotencyKey, payload);

        const offlineMockInspeccion: Inspeccion = {
          id: idempotencyKey,
          numero_inspeccion: 4800,
          numero_revision: 1,
          vehiculo_id: 'offline-vehiculo',
          vehiculo_patente: placa.toUpperCase(),
          creado_por_id: 'offline-coord',
          fecha: new Date().toISOString(),
          kilometraje: Number(kilometraje),
          estado: tieneCualquierSubestandar ? 'con_hallazgos' : 'pendiente_aprobacion',
          resultado_general: tieneCualquierSubestandar ? 'con_hallazgos' : 'aprobado',
          checklist_items: payload.checklist_items,
          evidencias: payload.evidencias,
          created_at: new Date().toISOString()
        };

        onSuccess(offlineMockInspeccion);
        return;
      }

      // Envío normal a la API
      const newInspeccion = await apiFetch<Inspeccion>('/inspecciones', {
        method: 'POST',
        headers: {
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      onSuccess(newInspeccion);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la inspección';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </button>
      )}

      {/* Banner de Modo */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
            {isEditingMode ? `Re-inspección · Planilla N° ${initialInspeccionToEdit.numero_inspeccion} (Revisión N° ${initialInspeccionToEdit.numero_revision + 1})` : 'Nueva Inspección Técnica · Formato FO-M4-P13-96'}
          </span>
          <h2 className="text-xl font-bold mt-1">
            {isEditingMode ? 'Corregir y Verificar Hallazgos en la Misma Planilla' : 'Formulario de Inspección de Flota'}
          </h2>
        </div>

        {/* Status Badge Live */}
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
            tieneCualquierSubestandar ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {tieneCualquierSubestandar ? (
              <><AlertOctagon className="w-4 h-4" /> CON HALLAZGOS</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> APROBADO</>
            )}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-200 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1. Datos del Vehículo y Empresa Contratista */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
            1. Datos del Vehículo y Empresa Contratista
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Placa / Patente (Alta Dinámica)"
                value={placa}
                onChange={e => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ej. NYP058"
                required
                disabled={isEditingMode}
              />
            </div>

            <div>
              <Select
                label="Empresa Contratista External"
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
                options={empresas.map(emp => ({ value: emp.id, label: emp.nombre }))}
              />
            </div>

            <div>
              <Input label="Color" value={color} onChange={e => setColor(e.target.value)} placeholder="Ej. Blanco" />
            </div>

            <div>
              <Input label="Equipo Auxiliar" value={equipoAuxiliar} onChange={e => setEquipoAuxiliar(e.target.value)} placeholder="Ej. Winche / Barra" />
            </div>

            <div>
              <Input
                label="Kilometraje Actual (Km)"
                type="number"
                value={kilometraje}
                onChange={e => setKilometraje(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} required />
            </div>

            <div>
              <Input label="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} required />
            </div>

            <div>
              <Input label="Año" type="number" value={año} onChange={e => setAño(Number(e.target.value))} required />
            </div>

            <div>
              <Input label="N° Interno del Vehículo" value={numeroInterno} onChange={e => setNumeroInterno(e.target.value)} placeholder="Ej. V-102" />
            </div>

            <div>
              <Input label="Hora de Inspección" type="time" value={horaInspeccion} onChange={e => setHoraInspeccion(e.target.value)} />
            </div>

            <div>
              <Input label="Área a Transitar" value={areaTransitar} onChange={e => setAreaTransitar(e.target.value)} placeholder="Ej. Mina / Operaciones" />
            </div>
          </div>
        </div>

        {/* 2. Los 9 Sistemas Técnicos con Expand/Collapse (ADJ-03) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              2. Evaluación por Sistemas ({sistemas.length} Sistemas Técnicos)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              E = Estándar | S = Subestándar | N/A = No Aplica
            </span>
          </div>

          {sistemas.map(sys => {
            const sysItems = catalogo.filter(cat => cat.sistema_id === sys.id || cat.codigo_item?.startsWith(sys.codigo));
            // Si no hay mapeo específico, asignar proporcionalmente
            const itemsToRender = sysItems.length > 0 ? sysItems : catalogo.slice(0, 4);

            return (
              <SistemaChecklist
                key={sys.id}
                sistema={sys}
                items={itemsToRender}
                values={itemsEvaluation}
                onChange={handleItemChange}
                defaultExpanded={sys.codigo === '1' || sys.codigo === '2'}
              />
            );
          })}
        </div>

        {/* 3. Técnicos de Inspección Firmantes (RN-10) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
            3. Técnicos de Inspección Actuantes (Máx. 3 Técnicos)
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Usted está autenticado como el **primer firmante principal**. Si actuaron otros técnicos en el mismo reporte, agregue sus nombres (hasta 2 adicionales).
          </p>

          <div className="flex items-center gap-2">
            <Input
              value={nuevoTecnicoNombre}
              onChange={e => setNuevoTecnicoNombre(e.target.value)}
              placeholder="Nombre del técnico adicional (ej. Jhon R.)..."
              disabled={tecnicosAdicionales.length >= 2}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddTecnico}
              disabled={!nuevoTecnicoNombre.trim() || tecnicosAdicionales.length >= 2}
              className="mt-5"
            >
              <Plus className="w-4 h-4" /> Agregar
            </Button>
          </div>

          {tecnicosAdicionales.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tecnicosAdicionales.map((nombre, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold"
                >
                  Técnico Adicional #{idx + 2}: {nombre}
                  <button
                    type="button"
                    onClick={() => handleRemoveTecnico(idx)}
                    className="hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!isEditingMode && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Firma Digital del Técnico Logueado *
              </label>
              <DigitalSignature onSave={setFirmaUrl} />
            </div>
          )}
        </div>

        {/* 4. Observaciones y Evidencias */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
            4. Observaciones y Evidencias Fotográficas
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Observaciones del Técnico
            </label>
            <textarea
              rows={2}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Escriba comentarios u observaciones relevantes de la revisión técnica..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Mantenimiento / Intervención Recomendada
            </label>
            <textarea
              rows={2}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Describa si se requiere mantenimiento preventivo o correctivo..."
              value={mantenimientoRecomendado}
              onChange={e => setMantenimientoRecomendado(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Evidencias Fotográficas ({evidencias.length})
              </span>
              <div className="flex gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors">
                  <Camera className="w-4 h-4" /> Tomar Foto
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors">
                  <Upload className="w-4 h-4" /> Galería
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            </div>

            {evidencias.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {evidencias.map((ev, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video">
                    <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            {isEditingMode ? '💾 Guardar Re-inspección y Corregir Planilla' : '🚀 Registrar Inspección'}
          </Button>
        </div>
      </form>
    </div>
  );
};
