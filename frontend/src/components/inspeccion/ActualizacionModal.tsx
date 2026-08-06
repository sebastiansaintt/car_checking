import React, { useState } from 'react';
import { Edit3, X, Check } from 'lucide-react';
import { Inspeccion } from '../../types';

interface ActualizacionModalProps {
  isOpen: boolean;
  inspeccion: Inspeccion | null;
  onConfirm: (motivo: string, fechaActualizacion: string) => void;
  onCancel: () => void;
}

export const ActualizacionModal: React.FC<ActualizacionModalProps> = ({
  isOpen,
  inspeccion,
  onConfirm,
  onCancel,
}) => {
  const [motivo, setMotivo] = useState<string>('correccion_hallazgos');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0, 16));

  if (!isOpen || !inspeccion) return null;

  const siguienteSub = (inspeccion.numero_revision || 1) + 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
            <Edit3 className="w-5 h-5" />
            <span>Crear Subregistro de Inspección</span>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-4 text-xs text-blue-200 leading-relaxed">
          Vas a crear el <strong>Subregistro N°#{siguienteSub}</strong> de la planilla <strong>N°#{inspeccion.numero_inspeccion}</strong> (Placa: <span className="font-mono text-white font-bold">{inspeccion.vehiculo_patente || inspeccion.vehiculo?.patente}</span>).
          <br /><br />
          Esto mantendrá el registro previo intacto de acuerdo con la <em>Regla de Oro de Historial Inmutable</em>.
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Motivo de la actualización *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="correccion_hallazgos">Corrección de hallazgos subestándar</option>
              <option value="error_registro">Error o ajuste en registro anterior</option>
              <option value="reinspeccion_programada">Reinspección programada de control</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fecha / Hora de actualización
            </label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo, fecha)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
          >
            <Check className="w-4 h-4" />
            Confirmar y Editar
          </button>
        </div>
      </div>
    </div>
  );
};
