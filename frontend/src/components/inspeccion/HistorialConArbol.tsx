import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, Edit3, Download, Layers } from 'lucide-react';
import { Inspeccion, Role } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

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
      <div className="border border-[#E5E7EB] bg-white rounded-container p-8 text-center text-[#6B7280]">
        <Layers className="w-10 h-10 mx-auto mb-2 text-[#9CA3AF]" />
        <p className="text-sm font-medium">No se encontraron inspecciones registradas.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#E5E7EB] bg-white rounded-container overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="table-industrial">
          <thead>
            <tr>
              <th className="w-10 text-center"></th>
              <th>Planilla</th>
              <th>Tipo</th>
              <th>Fecha (Colombia)</th>
              <th>Placa</th>
              <th>Empresa</th>
              <th>Dictamen</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {primariasList.map((primaria) => {
              const subs = (subregistrosMap[primaria.id] || []).sort(
                (a, b) => a.numero_revision - b.numero_revision
              );
              const hasSubs = subs.length > 0;
              const isExpanded = !!expandedMap[primaria.id];

              const esHallazgo = primaria.resultado_general === 'con_hallazgos' || primaria.resultado_general === 'no_apto';

              return (
                <React.Fragment key={primaria.id}>
                  {/* Fila Primaria */}
                  <tr className="hover:bg-[#F9FAFB] transition-colors duration-150">
                    <td className="text-center">
                      {hasSubs && (
                        <button
                          onClick={() => toggleExpand(primaria.id)}
                          className="p-1 text-[#6B7280] hover:text-[#111827] transition rounded hover:bg-[#E5E7EB]/50"
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
                    <td className="font-mono text-xs font-bold text-[#111827]">
                      N°{primaria.numero_inspeccion}
                      {hasSubs && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#1E40AF] text-[10px] font-semibold">
                          {subs.length} sub
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1E3A5F]/10 text-[#1E3A5F]">
                        Primario
                      </span>
                    </td>
                    <td className="font-mono text-xs text-[#6B7280]">
                      {formatFechaColombia(primaria.fecha)}
                    </td>
                    <td className="font-mono font-bold text-sm text-[#111827] uppercase">
                      {primaria.vehiculo_patente || primaria.vehiculo?.patente || 'N/A'}
                    </td>
                    <td className="text-xs text-[#6B7280] truncate max-w-[140px]">
                      {primaria.empresa_contratista_nombre || 'N/A'}
                    </td>
                    <td>
                      <Badge variant={esHallazgo ? 'no_apto' : 'apto'}>
                        {esHallazgo ? 'Con hallazgos' : 'Aprobado'}
                      </Badge>
                    </td>
                    <td className="capitalize text-xs text-[#6B7280]">
                      {primaria.estado.replace(/_/g, ' ')}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => onVer(primaria)}>
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </Button>
                        {canEdit && onEditar && (
                          <Button variant="secondary" size="sm" onClick={() => onEditar(primaria)}>
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </Button>
                        )}
                        {canPDF && onDescargarPDF && (
                          <Button variant="secondary" size="sm" onClick={() => onDescargarPDF(primaria)}>
                            <Download className="w-3.5 h-3.5" /> PDF
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Filas Indentadas de Subregistros */}
                  {isExpanded &&
                    subs.map((sub) => {
                      const subEsHallazgo = sub.resultado_general === 'con_hallazgos' || sub.resultado_general === 'no_apto';
                      return (
                        <tr
                          key={sub.id}
                          className="bg-[#FAFAFA] hover:bg-[#F3F4F6] transition-colors border-l-4 border-amber-500"
                        >
                          <td className="text-center font-mono text-[#9CA3AF]">
                            └
                          </td>
                          <td className="font-mono text-xs text-[#374151] font-medium pl-4">
                            N°{sub.numero_inspeccion}
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Sub #{sub.numero_revision}
                            </span>
                          </td>
                          <td className="font-mono text-xs text-[#6B7280]">
                            {formatFechaColombia(sub.fecha_actualizacion || sub.fecha)}
                          </td>
                          <td className="font-mono font-bold text-xs text-[#111827] uppercase">
                            {sub.vehiculo_patente || sub.vehiculo?.patente || 'N/A'}
                          </td>
                          <td className="text-xs text-[#6B7280] truncate max-w-[140px]">
                            {sub.empresa_contratista_nombre || 'N/A'}
                          </td>
                          <td>
                            <Badge variant={subEsHallazgo ? 'no_apto' : 'apto'}>
                              {subEsHallazgo ? 'Con hallazgos' : 'Aprobado'}
                            </Badge>
                          </td>
                          <td className="capitalize text-xs text-[#6B7280]">
                            {sub.estado.replace(/_/g, ' ')}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => onVer(sub)}>
                                <Eye className="w-3.5 h-3.5" /> Ver
                              </Button>
                              {canEdit && onEditar && (
                                <Button variant="secondary" size="sm" onClick={() => onEditar(sub)}>
                                  <Edit3 className="w-3.5 h-3.5" /> Editar
                                </Button>
                              )}
                              {canPDF && onDescargarPDF && (
                                <Button variant="secondary" size="sm" onClick={() => onDescargarPDF(sub)}>
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
