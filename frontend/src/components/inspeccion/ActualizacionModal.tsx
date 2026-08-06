import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Inspeccion } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';

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

  if (!inspeccion) return null;

  const siguienteSub = (inspeccion.numero_revision || 1) + 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Crear Subregistro de Inspección"
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 w-full justify-end">
          <Button variant="secondary" size="md" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => onConfirm(motivo, fecha)}
          >
            <Check className="w-4 h-4" /> Confirmar y Editar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-container p-3.5 text-xs text-[#1E40AF] leading-relaxed">
          Vas a crear el <strong>Subregistro N°#{siguienteSub}</strong> de la planilla <strong>N°#{inspeccion.numero_inspeccion}</strong> (Placa: <span className="font-mono text-[#111827] font-bold uppercase">{inspeccion.vehiculo_patente || inspeccion.vehiculo?.patente}</span>).
          <br /><br />
          El registro anterior permanecerá intacto para cumplir la <em>Regla de Oro de Historial Inmutable</em>.
        </div>

        <div className="space-y-3">
          <Select
            label="Motivo de la actualización *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            options={[
              { value: 'correccion_hallazgos', label: 'Corrección de hallazgos subestándar' },
              { value: 'error_registro', label: 'Error o ajuste en registro anterior' },
              { value: 'reinspeccion_programada', label: 'Reinspección programada de control' },
            ]}
          />

          <Input
            label="Fecha / Hora de actualización"
            type="datetime-local"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};
