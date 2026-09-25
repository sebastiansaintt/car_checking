import React from 'react';
import { DictadoInspeccionResponse } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle2, AlertTriangle, Sparkles, Car, Gauge, FileText } from 'lucide-react';

interface VoiceConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DictadoInspeccionResponse | null;
}

export const VoiceConfirmationModal: React.FC<VoiceConfirmationModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const totalFallas = data.items_subestandar?.length || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inspección Procesada con IA" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Banner superior de éxito */}
        <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
          <div className="p-1.5 bg-emerald-100 rounded-full text-emerald-700 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-emerald-950">Datos aplicados automáticamente</p>
            <p className="text-emerald-800 text-xs mt-0.5">
              Gemini interpretó tu dictado y actualizó el formulario. Puedes revisar o ajustar cualquier dato antes de estampar la firma y guardar.
            </p>
          </div>
        </div>

        {/* Resumen de campos informativos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
            <Car className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Vehículo</span>
              <span className="font-bold text-gray-900 text-xs">
                {data.marca || data.modelo
                  ? `${data.marca || ''} ${data.modelo || ''} ${data.año ? `(${data.año})` : ''}`.trim()
                  : data.placa || 'Datos generales'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-md">
            <Gauge className="w-4 h-4 text-gray-500 shrink-0" />
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Kilometraje</span>
              <span className="font-bold text-gray-900 text-xs">
                {data.kilometraje !== undefined && data.kilometraje !== null
                  ? `${data.kilometraje.toLocaleString()} km`
                  : 'No detectado'}
              </span>
            </div>
          </div>

          {data.placa && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md col-span-1">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Placa</span>
              <span className="font-bold text-gray-900 text-xs">{data.placa}</span>
            </div>
          )}

          {data.area_transitar && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md col-span-1">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">Área</span>
              <span className="font-bold text-gray-900 text-xs">{data.area_transitar}</span>
            </div>
          )}
        </div>

        {/* Fallas o condiciones subestándar detectadas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <AlertTriangle className={`w-3.5 h-3.5 ${totalFallas > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              Fallas / Condiciones Subestándar ({totalFallas})
            </span>
            <span className="text-[11px] text-gray-500">
              {totalFallas === 0 ? 'Vehículo 100% estándar' : 'Marcadas en rojo en el formulario'}
            </span>
          </div>

          {totalFallas === 0 ? (
            <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-md text-center text-xs text-gray-600">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              No se detectaron fallas. Todos los sistemas se mantienen como <strong>Estándar</strong>.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {data.items_subestandar.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-red-50/70 border border-red-200 rounded-md text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-red-900">
                    <span>{item.nombre_item || 'Componente'}</span>
                    {item.codigo_item && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-red-100 rounded text-red-800">
                        {item.codigo_item}
                      </span>
                    )}
                  </div>
                  <p className="text-red-700 text-[11px] italic">"{item.comentario_falla}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observaciones generales si las hubo */}
        {data.observaciones && (
          <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs space-y-1">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-500" /> Observaciones dictadas:
            </span>
            <p className="text-gray-600 italic">"{data.observaciones}"</p>
          </div>
        )}

        {/* Botón de acción */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Entendido, revisar formulario
          </Button>
        </div>
      </div>
    </Modal>
  );
};
