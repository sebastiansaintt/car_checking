import React, { useState } from 'react';
import { Inspeccion } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DigitalSignature } from '../ui/DigitalSignature';
import { SelloAprobacion } from './SelloAprobacion';
import { apiFetch } from '../../lib/api';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building2,
  Truck,
  UserCheck,
  Layers,
  Wrench,
  Clock
} from 'lucide-react';

interface AprobacionModalProps {
  inspeccion: Inspeccion | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

export const AprobacionModal: React.FC<AprobacionModalProps> = ({
  inspeccion,
  isOpen,
  onClose,
  onApproved,
}) => {
  const [firmaJefeUrl, setFirmaJefeUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!inspeccion) return null;

  const isApproved = inspeccion.estado === 'aprobado';
  const hallazgosPendientes = inspeccion.hallazgos?.filter((h) => !h.atendido) || [];
  const canApprove =
    !isApproved &&
    (inspeccion.estado === 'pendiente_aprobacion' || hallazgosPendientes.length === 0);

  const handleAprobar = async () => {
    if (!firmaJefeUrl) {
      setErrorMsg('Debe registrar y confirmar su firma digital de Jefe de Inspección.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiFetch<Inspeccion>(`/inspecciones/${inspeccion.id}/aprobar`, {
        method: 'POST',
        body: JSON.stringify({
          firma_url: firmaJefeUrl,
        }),
      });

      onApproved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al aprobar la inspección';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Revisión & Dictamen de Inspección — N° ${inspeccion.numero_inspeccion}`}
      maxWidth="4xl"
    >
      <div className="space-y-6 text-xs">
        {/* State Banner / Sello if Approved */}
        {isApproved ? (
          <SelloAprobacion
            selloRawUrl={inspeccion.sello_url}
            numeroInspeccion={inspeccion.numero_inspeccion}
            fechaCreacion={inspeccion.fecha}
            fechaAprobacion={inspeccion.fecha_aprobacion}
            fechaProximaRevision={inspeccion.fecha_proxima_revision}
            aprobadoPorNombre={inspeccion.aprobado_por_id || 'Jefe de Inspección'}
          />
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">Inspección Pendiente de Aprobación Final</h4>
                <p className="text-xs text-amber-800">
                  Revise los hallazgos resueltos y firme como Jefe de Inspección para emitir la certificación oficial de Sointer Ltda.
                </p>
              </div>
            </div>
            <Badge variant="neutral">
              {inspeccion.estado.toUpperCase().replace('_', ' ')}
            </Badge>
          </div>
        )}

        {/* Informacion Header Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> Empresa Contratista
            </span>
            <span className="font-semibold text-slate-900">
              {inspeccion.empresa_contratista?.nombre || 'Externo / Sointer'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1">
              <Truck className="w-3 h-3 text-slate-400" /> Vehículo / Placa
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {inspeccion.vehiculo?.patente || inspeccion.vehiculo_patente || inspeccion.vehiculo_id}
            </span>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1">
              <FileCheck className="w-3 h-3 text-slate-400" /> Dictamen General
            </span>
            <Badge variant={inspeccion.resultado_general === 'aprobado' ? 'estandar' : 'subestandar'}>
              {inspeccion.resultado_general.toUpperCase()}
            </Badge>
          </div>

          <div>
            <span className="text-slate-500 text-[11px] block font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> N° de Revisión
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              Revisión N° {inspeccion.numero_revision}
            </span>
          </div>
        </div>

        {/* Resumen por Sistemas */}
        {inspeccion.evaluaciones_sistema && inspeccion.evaluaciones_sistema.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Layers className="w-4 h-4 text-brand" /> Evaluación por Sistemas (9 Sistemas)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {inspeccion.evaluaciones_sistema.map((evalSys) => (
                <div
                  key={evalSys.id}
                  className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-xs"
                >
                  <span className="font-medium text-slate-800 truncate pr-2">
                    {evalSys.sistema?.nombre || `Sistema #${evalSys.sistema_id}`}
                  </span>
                  <Badge variant={evalSys.estado_sistema === 'aprobado' ? 'estandar' : 'subestandar'}>
                    {evalSys.estado_sistema === 'aprobado' ? 'APROBADO' : 'NO APROBADO'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Panel de Hallazgos y Correcciones */}
        {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <Wrench className="w-4 h-4 text-amber-600" /> Registro de Hallazgos y Corrección
            </h5>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {inspeccion.hallazgos.map((hallazgo) => (
                <div key={hallazgo.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-900">{hallazgo.descripcion}</p>
                    <span className="text-[11px] text-slate-500 block">
                      Registrado: {new Date(hallazgo.created_at).toLocaleString('es-CL')}
                    </span>
                  </div>
                  <Badge variant={hallazgo.atendido ? 'estandar' : 'subestandar'}>
                    {hallazgo.atendido ? 'ATENDIDO / CORREGIDO' : 'PENDIENTE'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Firmas de los Técnicos Inspectores */}
        {inspeccion.firmas_tecnicos && inspeccion.firmas_tecnicos.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
              <UserCheck className="w-4 h-4 text-brand" /> Firmas de Técnicos de Inspección
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {inspeccion.firmas_tecnicos.map((firma) => (
                <div key={firma.id} className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                  {firma.firma_url ? (
                    <img src={firma.firma_url} alt="Firma" className="h-12 object-contain mx-auto mb-1" />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-slate-400 italic text-[10px]">
                      (Acompañante sin firma)
                    </div>
                  )}
                  <span className="font-semibold text-slate-900 block truncate">
                    {firma.usuario?.nombre || firma.nombre_adicional || 'Técnico Inspector'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {firma.es_aprobador ? 'Jefe de Inspección' : 'Técnico Inspector'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Firma del Jefe y Botón de Aprobación */}
        {canApprove && (
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4 shadow-md">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Firma Digital del Jefe de Inspección</h4>
                <p className="text-xs text-slate-400">
                  Trace su firma a continuación para autorizar la liberación del vehículo y emitir el sello digital.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-300 flex items-center gap-2 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <DigitalSignature onSave={(dataUrl) => setFirmaJefeUrl(dataUrl)} />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAprobar}
                isLoading={isSubmitting}
                disabled={!firmaJefeUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <CheckCircle2 className="w-4 h-4" /> Aprobar & Emitir Sello Digital
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
