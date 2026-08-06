import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Inspeccion } from '../../types';
import { formatFechaColombia } from '../../lib/dateUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

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

  if (!registroPrimario) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Registro Primario Existente"
      maxWidth="max-w-lg"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="secondary" size="md" type="button" onClick={onCancel}>
            Es otra placa
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => onConfirm(motivo, fecha)}
          >
            <CheckCircle className="w-4 h-4" /> Continuar como Subregistro
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-container p-3.5 text-xs text-[#92400E]">
          <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706]" />
          <div>
            <p className="font-semibold text-[#78350F]">
              La placa <span className="font-mono uppercase font-bold text-[#111827]">{registroPrimario.vehiculo_patente || registroPrimario.vehiculo?.patente}</span> ya cuenta con una inspección primaria previa:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#92400E] mt-2 pt-2 border-t border-[#FDE68A]">
              <div>
                <span className="block text-[#A16207]">Planilla N°</span>
                <span className="font-semibold text-[#111827]">#{registroPrimario.numero_inspeccion}</span>
              </div>
              <div>
                <span className="block text-[#A16207]">Fecha Registro</span>
                <span className="font-semibold text-[#111827]">{formatFechaColombia(registroPrimario.fecha)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#6B7280] leading-relaxed">
          De acuerdo con la <strong>Regla de Oro de Historial Inmutable</strong>, esta evaluación se registrará como un <strong>subregistro vinculado</strong> a la planilla primaria N°#{registroPrimario.numero_inspeccion}.
        </p>

        <div className="space-y-3 pt-1">
          <Select
            label="Motivo del Subregistro *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            options={[
              { value: 'correccion_hallazgos', label: 'Corrección de hallazgos subestándar' },
              { value: 'error_registro', label: 'Error o ajuste en registro anterior' },
              { value: 'reinspeccion_programada', label: 'Reinspección programada de control' },
            ]}
          />

          <Input
            label="Fecha / Hora de Actualización (Colombia)"
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
