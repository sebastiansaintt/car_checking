import React from 'react';
import { Download, Edit3, ShieldCheck, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Inspeccion, Role } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SelloAprobacion } from './SelloAprobacion';

interface InspeccionDetailModalProps {
  isOpen: boolean;
  inspeccion: Inspeccion | null;
  userRol: Role;
  onClose: () => void;
  onEditar?: (inspeccion: Inspeccion) => void;
  onDescargarPDF?: (inspeccion: Inspeccion) => void;
}

export const InspeccionDetailModal: React.FC<InspeccionDetailModalProps> = ({
  isOpen,
  inspeccion,
  userRol,
  onClose,
  onEditar,
  onDescargarPDF,
}) => {
  if (!inspeccion) return null;

  const esSub = inspeccion.inspeccion_primaria_id || inspeccion.es_subregistro || inspeccion.numero_revision > 1;
  const canEdit = userRol === 'tecnico_inspector' || userRol === 'coordinador';
  const canPDF = ['ingeniero', 'programador', 'administrador', 'jefe_inspeccion', 'gerente'].includes(userRol);
  const esHallazgo = inspeccion.resultado_general === 'con_hallazgos' || inspeccion.resultado_general === 'no_apto';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Planilla N° #${inspeccion.numero_inspeccion}`}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>

          {canEdit && onEditar && (
            <Button type="button" variant="primary" onClick={() => onEditar(inspeccion)}>
              <Edit3 className="w-4 h-4" /> Editar / Subregistro
            </Button>
          )}

          {canPDF && onDescargarPDF && (
            <Button type="button" variant="primary" onClick={() => onDescargarPDF(inspeccion)}>
              <Download className="w-4 h-4" /> Descargar PDF
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 text-[#111827]">
        {/* Header Info */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#111827]">
                Placa: <span className="uppercase text-[#1E3A5F]">{inspeccion.vehiculo_patente || inspeccion.vehiculo?.patente}</span>
              </span>
              {esSub ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Subregistro #{inspeccion.numero_revision}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1E3A5F]/10 text-[#1E3A5F]">
                  Registro Primario
                </span>
              )}
            </div>
            <span className="text-xs text-[#6B7280] block mt-0.5">Fecha: {formatFechaColombia(inspeccion.fecha)}</span>
          </div>

          <Badge variant={esHallazgo ? 'no_apto' : 'apto'}>
            {esHallazgo ? 'Con hallazgos' : 'Aprobado'}
          </Badge>
        </div>

        {/* Grid Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAFAFA] p-3.5 rounded-container border border-[#E5E7EB] text-xs">
          <div>
            <span className="text-[#6B7280] block">Dictamen General</span>
            <span className={`font-bold capitalize ${!esHallazgo ? 'text-[#065F46]' : 'text-[#991B1B]'}`}>
              {inspeccion.resultado_general}
            </span>
          </div>
          <div>
            <span className="text-[#6B7280] block">Estado Planilla</span>
            <span className="font-semibold text-[#111827] capitalize">{inspeccion.estado.replace(/_/g, ' ')}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block">Empresa Contratista</span>
            <span className="font-semibold text-[#111827] truncate">{inspeccion.empresa_contratista_nombre || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block">Kilometraje</span>
            <span className="font-semibold text-[#111827]">{inspeccion.kilometraje} Km</span>
          </div>
        </div>

        {/* Motivo de Subregistro si aplica */}
        {esSub && inspeccion.motivo_actualizacion && (
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-container p-3 text-xs text-[#92400E]">
            <strong>Motivo del Subregistro:</strong> {inspeccion.motivo_actualizacion}
            {inspeccion.fecha_actualizacion && (
              <span className="text-[#A16207] block mt-0.5">
                Fecha Actualización: {formatFechaColombia(inspeccion.fecha_actualizacion)}
              </span>
            )}
          </div>
        )}

        {/* Evaluaciones por Sistema */}
        <div>
          <h4 className="text-xs font-semibold text-[#111827] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1E3A5F]" />
            Evaluación de los 9 Sistemas Técnicos
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {inspeccion.evaluaciones_sistema?.map((ev) => (
              <div key={ev.sistema_id} className="flex items-center justify-between bg-white border border-[#E5E7EB] px-3 py-2 rounded-input text-xs">
                <span className="text-[#374151] font-medium truncate">{ev.sistema_nombre || ev.sistema?.nombre || 'Sistema'}</span>
                {ev.estado_sistema === 'aprobado' ? (
                  <span className="flex items-center gap-1 text-[#065F46] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> E
                  </span>
                ) : ev.estado_sistema === 'no_aprobado' ? (
                  <span className="flex items-center gap-1 text-[#991B1B] font-bold">
                    <XCircle className="w-3.5 h-3.5" /> S
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[#6B7280]">
                    <MinusCircle className="w-3.5 h-3.5" /> N/A
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items Checklist Resumen */}
        <div>
          <h4 className="text-xs font-semibold text-[#111827] uppercase tracking-wide mb-2">Items Evaluados ({inspeccion.checklist_items?.length || 0})</h4>
          <div className="max-h-40 overflow-y-auto border border-[#E5E7EB] rounded-container bg-white divide-y divide-[#E5E7EB] text-xs">
            {inspeccion.checklist_items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-[#FAFAFA]">
                <span className="text-[#374151]">{item.catalogo_nombre || `Item #${idx+1}`}</span>
                <div className="flex items-center gap-2">
                  {item.comentario && <span className="text-[#6B7280] italic max-w-xs truncate">{item.comentario}</span>}
                  <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    item.valor === 'estandar' || item.valor === 'bueno' ? 'bg-[#ECFDF5] text-[#065F46]' :
                    item.valor === 'subestandar' || item.valor === 'malo' ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#F3F4F6] text-[#6B7280]'
                  }`}>
                    {item.valor === 'estandar' ? 'E' : item.valor === 'subestandar' ? 'S' : item.valor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hallazgos si existen */}
        {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#991B1B] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Hallazgos Subestándar Identificados ({inspeccion.hallazgos.length})
            </h4>
            <div className="space-y-1.5">
              {inspeccion.hallazgos.map((h) => (
                <div key={h.id} className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-container p-2.5 text-xs flex items-center justify-between">
                  <p className="text-[#991B1B] font-medium">{h.descripcion}</p>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${h.atendido ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF2F2] text-[#991B1B]'}`}>
                    {h.atendido ? 'Atendido' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Firma del Inspector */}
        <div className="bg-[#FAFAFA] p-3 rounded-container border border-[#E5E7EB] flex items-center justify-between text-xs">
          <div>
            <strong className="text-[#6B7280] block mb-1 uppercase tracking-wide">Firma Digital Inspector:</strong>
            <span className="font-semibold text-[#111827]">{inspeccion.creado_por_nombre || 'Técnico Inspector'}</span>
            <span className="text-[10px] text-[#6B7280] block">Técnico Inspector Sointer</span>
          </div>
          {(inspeccion.firma_url || (inspeccion.firmas_tecnicos && inspeccion.firmas_tecnicos[0]?.firma_url)) ? (
            <div className="bg-white p-1.5 border border-[#E5E7EB] rounded shadow-sm">
              <img
                src={inspeccion.firma_url || inspeccion.firmas_tecnicos?.[0]?.firma_url}
                alt="Firma del Inspector"
                className="h-12 object-contain"
              />
            </div>
          ) : (
            <span className="text-xs text-[#9CA3AF] italic">[Firma registrada en sistema]</span>
          )}
        </div>

        {/* Observaciones y Mantenimiento Recomendado */}
        {(inspeccion.observaciones || inspeccion.mantenimiento_recomendado) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {inspeccion.observaciones && (
              <div className="bg-[#FAFAFA] p-3 rounded-container border border-[#E5E7EB]">
                <strong className="text-[#6B7280] block mb-1">Observaciones:</strong>
                <p className="text-[#374151]">{inspeccion.observaciones}</p>
              </div>
            )}
            {inspeccion.mantenimiento_recomendado && (
              <div className="bg-[#FAFAFA] p-3 rounded-container border border-[#E5E7EB]">
                <strong className="text-[#6B7280] block mb-1">Mantenimiento Recomendado:</strong>
                <p className="text-[#374151]">{inspeccion.mantenimiento_recomendado}</p>
              </div>
            )}
          </div>
        )}

        {/* Sello de Aprobación Oficial si todos los sistemas están en E o dictamen Aprobado */}
        {(inspeccion.resultado_general === 'aprobado' ||
          inspeccion.resultado_general === 'apto' ||
          inspeccion.estado === 'aprobado' ||
          (inspeccion.evaluaciones_sistema &&
           inspeccion.evaluaciones_sistema.length > 0 &&
           inspeccion.evaluaciones_sistema.every(e => e.estado_sistema === 'aprobado'))) && (
          <SelloAprobacion
            numeroInspeccion={inspeccion.numero_inspeccion}
            fechaCreacion={formatFechaColombia(inspeccion.fecha)}
            fechaAprobacion={inspeccion.fecha_aprobacion ? formatFechaColombia(inspeccion.fecha_aprobacion) : formatFechaColombia(inspeccion.fecha)}
            aprobadoPorNombre={inspeccion.aprobado_por_nombre || 'Ingeniero de Calidad'}
          />
        )}
      </div>
    </Modal>
  );
};
