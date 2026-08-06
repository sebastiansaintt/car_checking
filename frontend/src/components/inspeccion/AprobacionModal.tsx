import React, { useState } from 'react';
import { Inspeccion } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DigitalSignature } from '../ui/DigitalSignature';
import { SelloAprobacion } from './SelloAprobacion';
import { PlanillaPDF } from './PlanillaPDF';
import { apiFetch } from '../../lib/api';
import {
  CheckCircle2,
  AlertTriangle,
  Printer,
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
  const [isPDFOpen, setIsPDFOpen] = useState<boolean>(false);

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

  const placa = inspeccion.vehiculo?.patente || inspeccion.vehiculo_patente || inspeccion.vehiculo_id;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Inspección N° ${inspeccion.numero_inspeccion}`}
        description={`Revisión y dictamen · ${placa}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5 text-xs">
          {/* Action Bar for Printing */}
          <div className="flex items-center justify-between px-3 py-2.5 bg-[#FAFAFA] rounded-container border border-[#E5E7EB]">
            <span className="text-xs font-medium text-[#6B7280]">Formulario</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPDFOpen(true)}
            >
              <Printer className="w-3.5 h-3.5" /> Ver / Imprimir Planilla
            </Button>
          </div>

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
            <div className="flex items-center gap-3 px-3 py-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-container">
              <div className="text-[#92400E]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#92400E]">Pendiente de Aprobación</p>
                <p className="text-[11px] text-[#92400E]/70">
                  Revise los hallazgos y firme como Jefe de Inspección para emitir la certificación.
                </p>
              </div>
              <Badge variant="revision">
                {inspeccion.estado.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}

          {/* Información de la inspección */}
          <div className="space-y-3">
            <table className="table-industrial">
              <tbody>
                <tr>
                  <td className="text-[#6B7280] font-medium w-40">Empresa Contratista</td>
                  <td className="font-medium">{inspeccion.empresa_contratista?.nombre || inspeccion.empresa_contratista_nombre || 'Sointer'}</td>
                </tr>
                <tr>
                  <td className="text-[#6B7280] font-medium">Vehículo / Placa</td>
                  <td className="font-mono font-semibold">{placa}</td>
                </tr>
                <tr>
                  <td className="text-[#6B7280] font-medium">Dictamen General</td>
                  <td>
                    <Badge variant={inspeccion.resultado_general === 'aprobado' ? 'apto' : 'no_apto'}>
                      {inspeccion.resultado_general?.replace(/_/g, ' ') ?? '—'}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <td className="text-[#6B7280] font-medium">Revisión</td>
                  <td className="font-mono">N° {inspeccion.numero_revision}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumen por Sistemas */}
          {inspeccion.evaluaciones_sistema && inspeccion.evaluaciones_sistema.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#111827] uppercase tracking-wide">
                Evaluación por Sistemas
              </h5>
              <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Sistema</th>
                      <th className="text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspeccion.evaluaciones_sistema.map((evalSys) => (
                      <tr key={evalSys.id}>
                        <td className="font-medium">
                          {evalSys.sistema?.nombre || evalSys.sistema_nombre || `Sistema #${evalSys.sistema_id}`}
                        </td>
                        <td className="text-right">
                          <Badge variant={evalSys.estado_sistema === 'aprobado' ? 'apto' : 'no_apto'}>
                            {evalSys.estado_sistema === 'aprobado' ? 'Aprobado' : 'No aprobado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Panel de Hallazgos */}
          {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#111827] uppercase tracking-wide">
                Registro de Hallazgos
              </h5>
              <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                <table className="table-industrial">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>Fecha</th>
                      <th className="text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspeccion.hallazgos.map((hallazgo) => (
                      <tr key={hallazgo.id}>
                        <td className="font-medium">{hallazgo.descripcion}</td>
                        <td className="font-mono text-xs text-[#6B7280]">
                          {new Date(hallazgo.created_at).toLocaleDateString('es-CL')}
                        </td>
                        <td className="text-right">
                          <Badge variant={hallazgo.atendido ? 'apto' : 'no_apto'}>
                            {hallazgo.atendido ? 'Atendido' : 'Pendiente'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Firmas de los Técnicos */}
          {inspeccion.firmas_tecnicos && inspeccion.firmas_tecnicos.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-[#111827] uppercase tracking-wide">
                Firmas de Técnicos
              </h5>
              <div className="border border-[#E5E7EB] rounded-container overflow-hidden divide-y divide-[#F3F4F6]">
                {inspeccion.firmas_tecnicos.map((firma) => (
                  <div key={firma.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-medium text-[#111827] block">
                        {firma.usuario?.nombre || firma.nombre_adicional || 'Técnico Inspector'}
                      </span>
                      <span className="text-[11px] text-[#9CA3AF]">
                        {firma.es_aprobador ? 'Jefe de Inspección' : 'Técnico Inspector'}
                      </span>
                    </div>
                    {firma.firma_url ? (
                      <div className="bg-white border border-[#E5E7EB] p-1 rounded-input">
                        <img src={firma.firma_url} alt="Firma" className="h-10 object-contain" />
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#9CA3AF] italic">Sin firma</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección de Firma del Jefe y Botón de Aprobación */}
          {canApprove && (
            <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-[#111827]">Firma Digital del Jefe de Inspección</h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Trace su firma para autorizar la liberación y emitir el sello digital.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-container text-[#991B1B] flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <DigitalSignature onSave={(dataUrl) => setFirmaJefeUrl(dataUrl)} />

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} type="button">
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAprobar}
                  isLoading={isSubmitting}
                  disabled={!firmaJefeUrl}
                >
                  <CheckCircle2 className="w-4 h-4" /> Aprobar y Emitir Sello
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Planilla PDF Printable Modal */}
      <PlanillaPDF
        inspeccion={inspeccion}
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
      />
    </>
  );
};
