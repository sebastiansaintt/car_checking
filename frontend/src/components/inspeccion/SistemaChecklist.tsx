import React, { useState } from 'react';
import { CatalogoSistema, CatalogoItem } from '../../types';


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
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calcular dictamen visual en tiempo real para este sistema
  const tieneSubestandar = items.some(item => {
    const val = values[item.id]?.valor;
    return val === 'subestandar';
  });

  const todosEvaluados = items.every(item => values[item.id]?.valor);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800 transition-all duration-200">
      {/* Header Expand/Collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs">
            {sistema.codigo}
          </span>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base">
            {sistema.nombre}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            ({items.length} ítems)
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Badge de Dictamen en Tiempo Real */}
          {todosEvaluados && (
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full ${
                tieneSubestandar
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              }`}
            >
              {tieneSubestandar ? '🔴 NO APROBADO' : '🟢 APROBADO'}
            </span>
          )}

          {/* Chevron expand/collapse */}
          <svg
            className={`w-5 h-5 text-slate-500 transform transition-transform duration-200 ${
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
        <div className="p-4 sm:p-5 space-y-4 border-t border-slate-100 dark:border-slate-700/50">
          {items.map(item => {
            const currentVal = values[item.id]?.valor || 'estandar';
            const currentComentario = values[item.id]?.comentario || '';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-lg border transition-colors ${
                  currentVal === 'subestandar'
                    ? 'border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20'
                    : 'border-slate-100 dark:border-slate-700/40 bg-slate-50/30 dark:bg-slate-900/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Info del Ítem */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {item.codigo_item && (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {item.codigo_item}
                        </span>
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {item.nombre}
                      </span>
                    </div>
                    {item.descripcion && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Selector E / S / N/A */}
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                    {/* E - Estándar */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'estandar', currentComentario)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        currentVal === 'estandar'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      E (Estándar)
                    </button>

                    {/* S - Subestándar */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'subestandar', currentComentario)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        currentVal === 'subestandar'
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      S (Subestándar)
                    </button>

                    {/* N/A - No Aplica */}
                    <button
                      type="button"
                      onClick={() => onChange(item.id, 'na', currentComentario)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        currentVal === 'na'
                          ? 'bg-slate-600 text-white shadow-sm ring-2 ring-slate-600/30'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      N/A
                    </button>
                  </div>
                </div>

                {/* Comentario si es Subestándar */}
                {currentVal === 'subestandar' && (
                  <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-900/40">
                    <input
                      type="text"
                      placeholder="Describa el hallazgo subestándar (requerido para la orden de trabajo)..."
                      value={currentComentario}
                      onChange={e => onChange(item.id, 'subestandar', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-md border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
