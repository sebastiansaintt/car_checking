import React, { useState, useEffect } from 'react';
import { Vehiculo, CatalogoSistema, CatalogoItem, EmpresaContratista, Inspeccion } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DigitalSignature } from '../ui/DigitalSignature';
import { SistemaChecklist } from './SistemaChecklist';
import { SubregistroModal } from './SubregistroModal';
import { apiFetch } from '../../lib/api';
import { generateUUID } from '../../lib/offlineQueue';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

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
  const [placa, setPlaca] = useState<string>(initialInspeccionToEdit?.vehiculo_patente || initialInspeccionToEdit?.vehiculo?.patente || '');
  const [placaError, setPlacaError] = useState<string | null>(null);
  const [empresaId, setEmpresaId] = useState<string>(initialInspeccionToEdit?.empresa_contratista_id || '');
  const [marca, setMarca] = useState<string>(initialInspeccionToEdit?.vehiculo?.marca || '');
  const [modelo, setModelo] = useState<string>(initialInspeccionToEdit?.vehiculo?.modelo || '');
  const [año, setAño] = useState<number>(initialInspeccionToEdit?.vehiculo?.año || new Date().getFullYear());
  const [tipoVehiculo, setTipoVehiculo] = useState<string>('Camioneta');
  const [numeroInterno, setNumeroInterno] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [equipoAuxiliar, setEquipoAuxiliar] = useState<string>(initialInspeccionToEdit?.equipo_auxiliar || '');
  const [areaTransitar, setAreaTransitar] = useState<string>(initialInspeccionToEdit?.area_transitar || '');
  const [kilometraje, setKilometraje] = useState<number>(initialInspeccionToEdit?.kilometraje || 0);
  const [horaInspeccion, setHoraInspeccion] = useState<string>(
    initialInspeccionToEdit?.hora_inspeccion || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // Subregistro states
  const [inspeccionPrimariaId, setInspeccionPrimariaId] = useState<string | null>(initialInspeccionToEdit?.inspeccion_primaria_id || null);
  const [registroPrimarioObj, setRegistroPrimarioObj] = useState<Inspeccion | null>(null);
  const [motivoActualizacion, setMotivoActualizacion] = useState<string>(initialInspeccionToEdit?.motivo_actualizacion || '');
  const [fechaActualizacion, setFechaActualizacion] = useState<string>(initialInspeccionToEdit?.fecha_actualizacion || '');
  const [showSubregistroModal, setShowSubregistroModal] = useState<boolean>(false);

  // Formateador y validador de Placa en tiempo real
  const handlePlacaChange = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length > 3) {
      clean = clean.slice(0, 3) + ' ' + clean.slice(3, 6);
    }
    setPlaca(clean);

    if (clean.length > 0 && !/^[A-Z]{3} \d{3}$/.test(clean)) {
      setPlacaError('Formato inválido. Debe ser ABC 123');
    } else {
      setPlacaError(null);
    }
  };

  // Detección automática de registro primario vía Debounce (S2.4)
  useEffect(() => {
    if (isEditingMode || !/^[A-Z]{3} \d{3}$/.test(placa)) return;

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<{ tiene_registro_primario: boolean; registro_primario: Inspeccion | null }>(
          `/inspecciones/check-placa/${encodeURIComponent(placa)}`
        );
        if (res.tiene_registro_primario && res.registro_primario) {
          setRegistroPrimarioObj(res.registro_primario);
          setShowSubregistroModal(true);
        }
      } catch (err) {
        // Silencioso en offline/error
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [placa, isEditingMode]);

  // Auto-completar datos si la placa existe en lista local
  useEffect(() => {
    if (!isEditingMode && placa.trim().length === 7) {
      const match = vehiculos.find(v => v.patente.toUpperCase() === placa.trim().toUpperCase());
      if (match) {
        if (match.marca) setMarca(match.marca);
        if (match.modelo) setModelo(match.modelo);
        if (match.año) setAño(match.año);
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
    return catalogo.reduce(
      (acc, item) => ({ ...acc, [item.id]: { valor: 'estandar', comentario: '' } }),
      {}
    );
  });

  // 3. Firmantes adicionales
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

  // 4. Firma digital
  const [firmaUrl, setFirmaUrl] = useState<string>(initialInspeccionToEdit?.firmas_tecnicos?.[0]?.firma_url || '');

  // 5. Observaciones
  const [observaciones, setObservaciones] = useState<string>(initialInspeccionToEdit?.observaciones || '');
  const [mantenimientoRecomendado, setMantenimientoRecomendado] = useState<string>(initialInspeccionToEdit?.mantenimiento_recomendado || '');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleItemChange = (catalogoId: string, valor: 'estandar' | 'subestandar' | 'na', comentario?: string) => {
    setItemsEvaluation(prev => ({
      ...prev,
      [catalogoId]: { valor, comentario }
    }));
  };

  const isSubregistroMode = isEditingMode || !!inspeccionPrimariaId;
  const tieneCualquierSubestandar = Object.values(itemsEvaluation).some(v => v.valor === 'subestandar');

  const handleConfirmSubregistroModal = (motivo: string, fechaColombia: string) => {
    if (registroPrimarioObj) {
      setInspeccionPrimariaId(registroPrimarioObj.id);
      setMotivoActualizacion(motivo);
      setFechaActualizacion(fechaColombia);
      if (registroPrimarioObj.vehiculo_patente || registroPrimarioObj.vehiculo?.patente) {
        setPlaca(registroPrimarioObj.vehiculo_patente || registroPrimarioObj.vehiculo?.patente || placa);
      }
      if (registroPrimarioObj.vehiculo?.marca) setMarca(registroPrimarioObj.vehiculo.marca);
      if (registroPrimarioObj.vehiculo?.modelo) setModelo(registroPrimarioObj.vehiculo.modelo);
      if (registroPrimarioObj.vehiculo?.año) setAño(registroPrimarioObj.vehiculo.año);
      if (registroPrimarioObj.empresa_contratista_id) setEmpresaId(registroPrimarioObj.empresa_contratista_id);
      if (registroPrimarioObj.kilometraje) setKilometraje(registroPrimarioObj.kilometraje);
      if (registroPrimarioObj.area_transitar) setAreaTransitar(registroPrimarioObj.area_transitar);
      if (registroPrimarioObj.equipo_auxiliar) setEquipoAuxiliar(registroPrimarioObj.equipo_auxiliar || '');
    }
    setShowSubregistroModal(false);
  };

  const handleCancelSubregistroModal = () => {
    setPlaca('');
    setInspeccionPrimariaId(null);
    setRegistroPrimarioObj(null);
    setShowSubregistroModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!placa.trim() || !/^[A-Z]{3} \d{3}$/.test(placa)) {
      setErrorMsg('Debe ingresar una placa válida en formato ABC 123.');
      return;
    }

    if (!empresaId) {
      setErrorMsg('Debe seleccionar una empresa contratista.');
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

      if (isEditingMode && initialInspeccionToEdit) {
        const updatePayload = {
          kilometraje: Number(kilometraje),
          observaciones,
          mantenimiento_recomendado: mantenimientoRecomendado,
          checklist_items: checklistItemsPayload,
          motivo_actualizacion: motivoActualizacion || 'correccion_hallazgos',
          fecha_actualizacion: fechaActualizacion || new Date().toISOString()
        };

        const updatedInspeccion = await apiFetch<Inspeccion>(`/inspecciones/${initialInspeccionToEdit.id}/corregir`, {
          method: 'PUT',
          body: JSON.stringify(updatePayload)
        });

        onSuccess(updatedInspeccion);
        return;
      }

      const payload = {
        placa: placa.trim().toUpperCase(),
        empresa_contratista_id: empresaId,
        marca: marca || 'Mazda',
        modelo: modelo || 'BT-50',
        año: Number(año),
        tipo_vehiculo: tipoVehiculo,
        numero_interno: numeroInterno || undefined,
        color: color || undefined,
        equipo_auxiliar: equipoAuxiliar || undefined,
        area_transitar: areaTransitar || undefined,
        kilometraje: Number(kilometraje),
        hora_inspeccion: horaInspeccion,
        inspeccion_primaria_id: inspeccionPrimariaId || undefined,
        motivo_actualizacion: motivoActualizacion || undefined,
        fecha_actualizacion: fechaActualizacion || undefined,
        firma_url: firmaUrl,
        nombres_tecnicos_adicionales: tecnicosAdicionales,
        observaciones: observaciones || undefined,
        mantenimiento_recomendado: mantenimientoRecomendado || undefined,
        checklist_items: checklistItemsPayload
      };

      const idempotencyKey = generateUUID();

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
          created_at: new Date().toISOString()
        };

        onSuccess(offlineMockInspeccion);
        return;
      }

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
      <SubregistroModal
        isOpen={showSubregistroModal}
        registroPrimario={registroPrimarioObj}
        onConfirm={handleConfirmSubregistroModal}
        onCancel={handleCancelSubregistroModal}
      />

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
              ? `Re-inspección · Planilla N° ${initialInspeccionToEdit.numero_inspeccion}`
              : 'Formato FO-M4-P13-96'}
          </p>
          <h1 className="text-base font-semibold text-[#111827]">
            {isEditingMode ? 'Corregir y Crear Subregistro' : 'Nueva Inspección Técnica'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {isEditingMode
              ? 'Los datos actualizados se guardarán como un nuevo subregistro inmutable.'
              : 'Formulario digital de inspección técnica vehicular.'}
          </p>
        </div>

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
                label="Placa / Patente *"
                value={placa}
                onChange={e => handlePlacaChange(e.target.value)}
                placeholder="ABC 123"
                required
                disabled={isEditingMode}
              />
              {placaError && (
                <span className="text-[11px] text-red-500 font-medium block mt-1">{placaError}</span>
              )}
            </div>

            <div>
              <Select
                label="Empresa Contratista *"
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
                required
                disabled={isSubregistroMode}
                options={[
                  { value: '', label: 'Elegir contratista' },
                  ...empresas.map(emp => ({ value: emp.id, label: emp.nombre }))
                ]}
              />
            </div>

            <div>
              <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Mazda" required disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="Modelo" value={modelo} onChange={e => setModelo(e.target.value)} placeholder="BT-50" required disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="Año" type="number" value={año} onChange={e => setAño(Number(e.target.value))} required disabled={isSubregistroMode} />
            </div>

            <div>
              <Input
                label="Kilometraje Actual (km) *"
                type="number"
                value={kilometraje}
                onChange={e => setKilometraje(Number(e.target.value))}
                required
                disabled={isSubregistroMode}
              />
            </div>

            <div>
              <Input label="Área a Transitar" value={areaTransitar} onChange={e => setAreaTransitar(e.target.value)} placeholder="Industrial" disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="Equipo Auxiliar" value={equipoAuxiliar} onChange={e => setEquipoAuxiliar(e.target.value)} placeholder="Winche" disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="N° Interno" value={numeroInterno} onChange={e => setNumeroInterno(e.target.value)} placeholder="V-102" disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="Color" value={color} onChange={e => setColor(e.target.value)} placeholder="Blanco" disabled={isSubregistroMode} />
            </div>

            <div>
              <Input label="Hora de Inspección" type="time" value={horaInspeccion} onChange={e => setHoraInspeccion(e.target.value)} />
            </div>
          </div>
        </section>

        {/* 2. Los 9 Sistemas Técnicos */}
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

        {/* 3. Técnicos de Inspección Firmantes */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
            3. Técnicos de Inspección
          </h3>

          <div className="flex items-end gap-2">
            <Input
              value={nuevoTecnicoNombre}
              onChange={e => setNuevoTecnicoNombre(e.target.value)}
              placeholder="Nombre de técnico adicional..."
              disabled={tecnicosAdicionales.length >= 2}
              label="Técnico adicional (opcional)"
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
                Firma Digital del Técnico Inspector *
              </label>
              <DigitalSignature onSave={setFirmaUrl} />
            </div>
          )}
        </section>

        {/* 4. Observaciones */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-[#111827] uppercase tracking-wide border-b border-[#E5E7EB] pb-2">
            4. Observaciones del Registro
          </h3>

          <div>
            <label className="text-xs font-medium text-[#374151] block mb-1">
              Observaciones Generales
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
              placeholder="Detalle de mantenimiento preventivo o recomendado..."
              value={mantenimientoRecomendado}
              onChange={e => setMantenimientoRecomendado(e.target.value)}
            />
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
            {isEditingMode ? 'Guardar Subregistro' : 'Registrar Inspección'}
          </Button>
        </div>
      </form>
    </div>
  );
};
