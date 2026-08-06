import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, Edit3, Download, Layers, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Inspeccion, Role } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';

interface HistorialConArbolProps {
  inspecciones: Inspeccion[];
  userRol: Role;
  onVer: (inspeccion: Inspeccion) => void;
  onEditar?: (inspeccion: Inspeccion) => void;
  onDescargarPDF?: (inspeccion: Inspeccion) => void;
}

export const HistorialConArbol: React.FC<HistorialConArbolProps> = ({
  inspecciones,
  userRol,
  onVer,
  onEditar,
  onDescargarPDF,
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Separar primarias y agrupar subregistros
  const primariasMap: Record<string, Inspeccion> = {};
  const subregistrosMap: Record<string, Inspeccion[]> = {};

  inspecciones.forEach((insp) => {
    if (!insp.inspeccion_primaria_id) {
      primariasMap[insp.id] = insp;
    } else {
      const pId = insp.inspeccion_primaria_id;
      if (!subregistrosMap[pId]) {
        subregistrosMap[pId] = [];
      }
      subregistrosMap[pId].push(insp);
    }
  });

  // Si una inspección viene marcada como subregistro pero no encontramos su primaria en la lista entregada
  inspecciones.forEach((insp) => {
    if (insp.inspeccion_primaria_id && !primariasMap[insp.inspeccion_primaria_id]) {
      primariasMap[insp.id] = insp;
    }
  });

  const primariasList = Object.values(primariasMap).sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const canEdit = userRol === 'tecnico_inspector' || userRol === 'coordinador';
  const canPDF = ['ingeniero', 'programador', 'administrador', 'jefe_inspeccion', 'gerente'].includes(userRol);

  if (inspecciones.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Layers className="w-10 h-10 mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium">No se encontraron inspecciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 w-10"></th>
              <th className="py-3 px-4">N° Planilla</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Fecha (Colombia)</th>
              <th className="py-3 px-4">Placa</th>
              <th className="py-3 px-4">Empresa</th>
              <th className="py-3 px-4">Dictamen</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {primariasList.map((primaria) => {
              const subs = (subregistrosMap[primaria.id] || []).sort(
                (a, b) => a.numero_revision - b.numero_revision
              );
              const hasSubs = subs.length > 0;
              const isExpanded = !!expandedMap[primaria.id];

              return (
                <React.Fragment key={primaria.id}>
                  {/* Fila Primaria */}
                  <tr className="hover:bg-slate-800/40 transition group">
                    <td className="py-3 px-4 text-center">
                      {hasSubs && (
                        <button
                          onClick={() => toggleExpand(primaria.id)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition rounded hover:bg-slate-800"
                          title="Expandir/Colapsar subregistros"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100 flex items-center gap-2">
                      #{primaria.numero_inspeccion}
                      {hasSubs && (
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30">
                          {subs.length} sub
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-medium">
                        Primario
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {formatFechaColombia(primaria.fecha)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200 uppercase">
                      {primaria.vehiculo_patente || primaria.vehiculo?.patente || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                      {primaria.empresa_contratista_nombre || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          primaria.resultado_general.includes('aprobado') || primaria.resultado_general === 'apto'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {primaria.resultado_general.includes('aprobado') || primaria.resultado_general === 'apto' ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        {primaria.resultado_general}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-400">
                      {primaria.estado}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onVer(primaria)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition"
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        {canEdit && onEditar && (
                          <button
                            onClick={() => onEditar(primaria)}
                            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Editar / Crear subregistro"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </button>
                        )}
                        {canPDF && onDescargarPDF && (
                          <button
                            onClick={() => onDescargarPDF(primaria)}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/30 font-semibold text-[11px] flex items-center gap-1 transition"
                            title="Descargar PDF"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Filas Indentadas de Subregistros */}
                  {isExpanded &&
                    subs.map((sub) => (
                      <tr
                        key={sub.id}
                        className="bg-slate-950/60 hover:bg-slate-950 transition border-l-4 border-amber-500/80"
                      >
                        <td className="py-2.5 px-4 text-center text-slate-600 font-mono">
                          └
                        </td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-300 pl-6">
                          #{sub.numero_inspeccion}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            Sub #{sub.numero_revision}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {formatFechaColombia(sub.fecha_actualizacion || sub.fecha)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-300 uppercase">
                          {sub.vehiculo_patente || sub.vehiculo?.patente || 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 truncate max-w-[140px]">
                          {sub.empresa_contratista_nombre || 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              sub.resultado_general.includes('aprobado') || sub.resultado_general === 'apto'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {sub.resultado_general}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 capitalize text-slate-400">
                          {sub.estado}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onVer(sub)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 transition"
                            >
                              <Eye className="w-3 h-3" /> Ver
                            </button>
                            {canEdit && onEditar && (
                              <button
                                onClick={() => onEditar(sub)}
                                className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1 transition"
                              >
                                <Edit3 className="w-3 h-3" /> Editar
                              </button>
                            )}
                            {canPDF && onDescargarPDF && (
                              <button
                                onClick={() => onDescargarPDF(sub)}
                                className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 border border-blue-600/30 text-[10px] flex items-center gap-1 transition"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
