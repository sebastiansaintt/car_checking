import React, { useState } from 'react';
import { CatalogoSistema, CatalogoItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';


interface SistemaChecklistProps {
  sistema: CatalogoSistema;
  items: CatalogoItem[];
  values: Record<string, { valor: 'estandar' | 'subestandar' | 'na'; comentario?: string }>;
  onChange: (catalogo_id: string, valor: 'estandar' | 'subestandar' | 'na', comentario?: string) => void;
  defaultExpanded?: boolean;
}

export const SistemaChecklist: React.FC<SistemaChecklistProps> = ({
  sistema,
  items,
  values,
  onChange,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calcular dictamen visual en tiempo real para este sistema
  const tieneSubestandar = items.some(item => {
    const val = values[item.id]?.valor;
    return val === 'subestandar';
  });

  const todosEvaluados = items.every(item => values[item.id]?.valor);

  return (
    <div className="border border-[#E5E7EB] rounded-container overflow-hidden bg-white transition-all duration-200">
      {/* Header Expand/Collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#FAFAFA] hover:bg-[#F3F4F6] transition-colors duration-150 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-[6px] bg-[#1E3A5F] text-white font-semibold text-xs">
            {sistema.codigo}
          </span>
          <h3 className="font-semibold text-[#111827] text-sm">
            {sistema.nombre}
          </h3>
          <span className="text-xs text-[#9CA3AF] font-medium">
            ({items.length} ítems)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Badge de Dictamen en Tiempo Real */}
          {todosEvaluados && (
            <Badge variant={tieneSubestandar ? 'no_apto' : 'apto'}>
              {tieneSubestandar ? 'No aprobado' : 'Aprobado'}
            </Badge>
          )}

          {/* Chevron expand/collapse */}
          <svg
            className={`w-4 h-4 text-[#9CA3AF] transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Contenido de Ítems */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-2.5 border-t border-[#E5E7EB]">
          {items.map(item => {
            const currentVal = values[item.id]?.valor || 'estandar';
            const currentComentario = values[item.id]?.comentario || '';

            return (
              <div
                key={item.id}
                className={[
                  'p-3 rounded-container border transition-colors duration-150',
                  currentVal === 'subestandar'
                    ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                    : 'border-[#F3F4F6] bg-[#FAFAFA]',
                ].join(' ')}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Info del Ítem */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {item.codigo_item && (
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#374151]">
                          {item.codigo_item}
                        </span>
                      )}
                      <span className="font-medium text-[#111827] text-sm">
                        {item.nombre}
                      </span>
                    </div>
                    {item.descripcion && (
                      <p className="text-xs text-[#6B7280] mt-1">
                        {item.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Selector E / S / N/A */}
                  <div className="flex items-center gap-1 self-start sm:self-auto">
                    {/* E - Estándar */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'estandar', currentComentario)}
                      className={[
                        'px-2.5 py-1.5 rounded-button text-xs font-semibold transition-colors duration-150',
                        currentVal === 'estandar'
                          ? 'bg-[#065F46] text-white'
                          : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#ECFDF5] hover:text-[#065F46] hover:border-[#A7F3D0]',
                      ].join(' ')}
                    >
                      E
                    </button>

                    {/* S - Subestándar */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'subestandar', currentComentario)}
                      className={[
                        'px-2.5 py-1.5 rounded-button text-xs font-semibold transition-colors duration-150',
                        currentVal === 'subestandar'
                          ? 'bg-[#991B1B] text-white'
                          : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#991B1B] hover:border-[#FCA5A5]',
                      ].join(' ')}
                    >
                      S
                    </button>

                    {/* N/A - No Aplica */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'na', currentComentario)}
                      className={[
                        'px-2.5 py-1.5 rounded-button text-xs font-semibold transition-colors duration-150',
                        currentVal === 'na'
                          ? 'bg-[#374151] text-white'
                          : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]',
                      ].join(' ')}
                    >
                      N/A
                    </button>
                  </div>
                </div>

                {/* Comentario si es Subestándar */}
                {currentVal === 'subestandar' && (
                  <div className="mt-2.5 pt-2 border-t border-[#FCA5A5]/40">
                    <Input
                      placeholder="Describa el hallazgo subestándar..."
                      value={currentComentario}
                      onChange={e => onChange(item.id, 'subestandar', e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
