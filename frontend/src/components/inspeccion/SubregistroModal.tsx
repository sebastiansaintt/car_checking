import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Inspeccion } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';

interface SubregistroModalProps {
  isOpen: boolean;
  registroPrimario: Inspeccion | null;
  onConfirm: (motivo: string, fechaActualizacion: string) => void;
  onCancel: () => void;
}

export const SubregistroModal: React.FC<SubregistroModalProps> = ({
  isOpen,
  registroPrimario,
  onConfirm,
  onCancel,
}) => {
  const [motivo, setMotivo] = useState<string>('correccion_hallazgos');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 16));

  if (!isOpen || !registroPrimario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
            <AlertTriangle className="w-5 h-5" />
            <span>Vehículo con Registro Primario Existente</span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/60 rounded-lg p-4 text-sm space-y-2 border border-slate-700/50">
          <p className="text-slate-300">
            La placa <span className="font-mono font-bold text-amber-400">{registroPrimario.vehiculo_patente || registroPrimario.vehiculo?.patente}</span> ya cuenta con una inspección primaria registrada:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
            <div>
              <span className="block text-slate-500">Planilla N°</span>
              <span className="font-semibold text-slate-200">#{registroPrimario.numero_inspeccion}</span>
            </div>
            <div>
              <span className="block text-slate-500">Fecha Registro</span>
              <span className="font-semibold text-slate-200">{formatFechaColombia(registroPrimario.fecha)}</span>
            </div>
            <div>
              <span className="block text-slate-500">Estado / Dictamen</span>
              <span className="font-semibold text-slate-200 capitalize">{registroPrimario.resultado_general} ({registroPrimario.estado})</span>
            </div>
            <div>
              <span className="block text-slate-500">Empresa</span>
              <span className="font-semibold text-slate-200">{registroPrimario.empresa_contratista_nombre || 'N/A'}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Para garantizar la <strong className="text-amber-300">Regla de Oro de Historial Inmutable</strong>, este registro se guardará como un <strong className="text-slate-200">subregistro vinculado</strong> a la planilla primaría N°#{registroPrimario.numero_inspeccion}.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Motivo del Subregistro *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="correccion_hallazgos">Corrección de hallazgos subestándar</option>
              <option value="error_registro">Error o ajuste en registro anterior</option>
              <option value="reinspeccion_programada">Reinspección programada de control</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha / Hora de Actualización (Colombia)
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
          >
            Es otra placa
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo, fecha)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
          >
            <CheckCircle className="w-4 h-4" />
            Continuar como Subregistro
          </button>
        </div>
      </div>
    </div>
  );
};
