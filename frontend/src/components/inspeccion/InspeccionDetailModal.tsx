import React from 'react';
import { X, Download, Edit3, ShieldCheck, AlertCircle, FileText, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Inspeccion, Role } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';

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
  if (!isOpen || !inspeccion) return null;

  const esSub = inspeccion.inspeccion_primaria_id || inspeccion.es_subregistro || inspeccion.numero_revision > 1;
  const canEdit = userRol === 'tecnico_inspector' || userRol === 'coordinador';
  const canPDF = ['ingeniero', 'programador', 'administrador', 'jefe_inspeccion', 'gerente'].includes(userRol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-6 text-slate-100 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-400" />
                Planilla N° #{inspeccion.numero_inspeccion}
              </h2>
              {esSub ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Subregistro #{inspeccion.numero_revision}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Registro Primario
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Placa: <strong className="text-slate-200 uppercase font-mono">{inspeccion.vehiculo_patente || inspeccion.vehiculo?.patente}</strong> · Fecha: {formatFechaColombia(inspeccion.fecha)}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">Dictamen General</span>
            <span className={`font-bold capitalize ${inspeccion.resultado_general.includes('aprobado') || inspeccion.resultado_general === 'apto' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {inspeccion.resultado_general}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Estado Planilla</span>
            <span className="font-semibold text-slate-200 capitalize">{inspeccion.estado}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Empresa Contratista</span>
            <span className="font-semibold text-slate-200 truncate">{inspeccion.empresa_contratista_nombre || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Kilometraje</span>
            <span className="font-semibold text-slate-200">{inspeccion.kilometraje} Km</span>
          </div>
        </div>

        {/* Motivo de Subregistro si aplica */}
        {esSub && inspeccion.motivo_actualizacion && (
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 text-xs text-amber-200">
            <strong>Motivo de Subregistro:</strong> {inspeccion.motivo_actualizacion}
            {inspeccion.fecha_actualizacion && (
              <span className="text-slate-400 block mt-0.5">
                Fecha Actualización: {formatFechaColombia(inspeccion.fecha_actualizacion)}
              </span>
            )}
          </div>
        )}

        {/* Evaluaciones por Sistema */}
        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Evaluación de los 9 Sistemas Técnicos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {inspeccion.evaluaciones_sistema?.map((ev) => (
              <div key={ev.sistema_id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 px-3 py-2 rounded-lg text-xs">
                <span className="text-slate-300 font-medium truncate">{ev.sistema_nombre || ev.sistema?.nombre || 'Sistema'}</span>
                {ev.estado_sistema === 'aprobado' ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> E
                  </span>
                ) : ev.estado_sistema === 'no_aprobado' ? (
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <XCircle className="w-3.5 h-3.5" /> S
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MinusCircle className="w-3.5 h-3.5" /> N/A
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Items Checklist Resumen */}
        <div>
          <h3 className="text-sm font-bold text-slate-200 mb-2">Items Evaluados ({inspeccion.checklist_items?.length || 0})</h3>
          <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/40 divide-y divide-slate-800 text-xs">
            {inspeccion.checklist_items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-900/50">
                <span className="text-slate-300">{item.catalogo_nombre || `Item #${idx+1}`}</span>
                <div className="flex items-center gap-2">
                  {item.comentario && <span className="text-slate-500 italic max-w-xs truncate">{item.comentario}</span>}
                  <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    item.valor === 'estandar' || item.valor === 'bueno' ? 'bg-emerald-500/20 text-emerald-300' :
                    item.valor === 'subestandar' || item.valor === 'malo' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
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
            <h3 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Hallazgos Subestándar Identificados ({inspeccion.hallazgos.length})
            </h3>
            <div className="space-y-2">
              {inspeccion.hallazgos.map((h) => (
                <div key={h.id} className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-3 text-xs flex items-center justify-between">
                  <p className="text-rose-200">{h.descripcion}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${h.atendido ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {h.atendido ? 'Atendido' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observaciones y Mantenimiento Recomendado */}
        {(inspeccion.observaciones || inspeccion.mantenimiento_recomendado) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {inspeccion.observaciones && (
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                <strong className="text-slate-400 block mb-1">Observaciones:</strong>
                <p className="text-slate-300">{inspeccion.observaciones}</p>
              </div>
            )}
            {inspeccion.mantenimiento_recomendado && (
              <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                <strong className="text-slate-400 block mb-1">Mantenimiento Recomendado:</strong>
                <p className="text-slate-300">{inspeccion.mantenimiento_recomendado}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
          >
            Cerrar
          </button>

          {canEdit && onEditar && (
            <button
              type="button"
              onClick={() => onEditar(inspeccion)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
            >
              <Edit3 className="w-4 h-4" />
              Editar / Crear Subregistro
            </button>
          )}

          {canPDF && onDescargarPDF && (
            <button
              type="button"
              onClick={() => onDescargarPDF(inspeccion)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
