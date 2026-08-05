import React, { useState, useEffect } from 'react';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DigitalSignature } from '../ui/DigitalSignature';
import { SistemaChecklist } from './SistemaChecklist';
import { apiFetch, API_BASE_URL } from '../../lib/api';
import { generateUUID } from '../../lib/offlineQueue';
import { Camera, Upload, ArrowLeft, Plus, Trash2 } from 'lucide-react';

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
    <div className="space-y-6 max-w-4xl pb-12">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-xs font-medium text-[#6B7280] hover:text-[#111827] transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </button>
      )}

      {/* Header editorial */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[#9CA3AF] font-medium mb-1">
            {isEditingMode
              ? `Re-inspección · Planilla N° ${initialInspeccionToEdit.numero_inspeccion} (Revisión N° ${initialInspeccionToEdit.numero_revision + 1})`
              : 'Formato FO-M4-P13-96'}
          </p>
          <h1 className="text-base font-semibold text-[#111827]">
            {isEditingMode ? 'Corregir y Verificar Hallazgos' : 'Nueva Inspección Técnica'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEditingMode
              ? 'Corrija los hallazgos subestándar en la misma planilla.'
              : 'Formulario de inspección de flota vehicular.'}
          </p>
        </div>

        {/* Status badge live */}
        <Badge variant={tieneCualquierSubestandar ? 'no_apto' : 'apto'}>
          {tieneCualquierSubestandar ? 'Con hallazgos' : 'Aprobado'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] rounded-container text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* 1. Datos del Vehículo y Empresa Contratista */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
            1. Datos del Vehículo y Empresa Contratista
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Input
                label="Placa / Patente"
                value={placa}
                onChange={e => setPlaca(e.target.value.toUpperCase())}
                placeholder="Ej. NYP058"
                required
                disabled={isEditingMode}
              />
            </div>

            <div>
              <Select
                label="Empresa Contratista"
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
                label="Kilometraje Actual (km)"
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
              <Input label="N° Interno" value={numeroInterno} onChange={e => setNumeroInterno(e.target.value)} placeholder="Ej. V-102" />
            </div>

            <div>
              <Input label="Hora de Inspección" type="time" value={horaInspeccion} onChange={e => setHoraInspeccion(e.target.value)} />
            </div>

            <div>
              <Input label="Área a Transitar" value={areaTransitar} onChange={e => setAreaTransitar(e.target.value)} placeholder="Ej. Mina / Operaciones" />
            </div>
          </div>
        </section>

        {/* 2. Los 9 Sistemas Técnicos con Expand/Collapse (ADJ-03) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide">
              2. Evaluación por Sistemas ({sistemas.length} Sistemas)
            </h3>
            <span className="text-xs text-[#9CA3AF] font-medium">
              E = Estándar · S = Subestándar · N/A
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
                defaultExpanded={false}
              />
            );
          })}
        </section>

        {/* 3. Técnicos de Inspección Firmantes (RN-10) */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
            3. Técnicos de Inspección (Máx. 3)
          </h3>

          <p className="text-xs text-[#6B7280]">
            Usted es el primer firmante principal. Agregue nombres de técnicos adicionales si participaron (hasta 2).
          </p>

          <div className="flex items-end gap-2">
            <Input
              value={nuevoTecnicoNombre}
              onChange={e => setNuevoTecnicoNombre(e.target.value)}
              placeholder="Nombre del técnico adicional..."
              disabled={tecnicosAdicionales.length >= 2}
              label="Técnico adicional"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddTecnico}
              disabled={!nuevoTecnicoNombre.trim() || tecnicosAdicionales.length >= 2}
            >
              <Plus className="w-4 h-4" /> Agregar
            </Button>
          </div>

          {tecnicosAdicionales.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tecnicosAdicionales.map((nombre, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FAFAFA] border border-[#E5E7EB] text-[#111827] rounded-container text-xs font-medium"
                >
                  Técnico #{idx + 2}: {nombre}
                  <button
                    type="button"
                    onClick={() => handleRemoveTecnico(idx)}
                    className="text-[#9CA3AF] hover:text-[#991B1B] transition-colors duration-150"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!isEditingMode && (
            <div className="pt-3 border-t border-[#E5E7EB]">
              <label className="text-xs font-medium text-[#374151] block mb-2">
                Firma Digital del Técnico *
              </label>
              <DigitalSignature onSave={setFirmaUrl} />
            </div>
          )}
        </section>

        {/* 4. Observaciones y Evidencias */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
            4. Observaciones y Evidencias
          </h3>

          <div>
            <label className="text-xs font-medium text-[#374151] block mb-1">
              Observaciones del Técnico
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-input border border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-colors duration-150"
              placeholder="Comentarios u observaciones relevantes..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#374151] block mb-1">
              Mantenimiento Recomendado
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-input border border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/10 focus:border-[#1E3A5F] transition-colors duration-150"
              placeholder="Describa si se requiere mantenimiento preventivo o correctivo..."
              value={mantenimientoRecomendado}
              onChange={e => setMantenimientoRecomendado(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#374151]">
                Evidencias Fotográficas ({evidencias.length})
              </span>
              <div className="flex gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] rounded-button text-xs font-medium transition-colors duration-150">
                  <Camera className="w-3.5 h-3.5" /> Cámara
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#FAFAFA] border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] rounded-button text-xs font-medium transition-colors duration-150">
                  <Upload className="w-3.5 h-3.5" /> Galería
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              </div>
            </div>

            {evidencias.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {evidencias.map((ev, idx) => (
                  <div key={idx} className="relative rounded-container overflow-hidden border border-[#E5E7EB] aspect-video">
                    <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting}>
            {isEditingMode ? 'Guardar Re-inspección' : 'Registrar Inspección'}
          </Button>
        </div>
      </form>
    </div>
  );
};
