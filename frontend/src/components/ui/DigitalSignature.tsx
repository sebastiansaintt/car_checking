import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './Button';
import { RotateCcw } from 'lucide-react';

interface SignatureProps {
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
}

export const DigitalSignature: React.FC<SignatureProps> = ({ onSave, onClear }) => {
  const sigPad = useRef<SignatureCanvas | null>(null);

  const handleClear = () => {
    sigPad.current?.clear();
    if (onClear) onClear();
  };

  const handleEnd = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="border border-border rounded-input overflow-hidden bg-white touch-none">
        <SignatureCanvas
          ref={sigPad}
          penColor="#111827"
          canvasProps={{
            className: 'w-full h-36 border-none cursor-crosshair',
          }}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-secondary-text">
        <span>Firme dentro del recuadro</span>
        <Button variant="outline" size="sm" type="button" onClick={handleClear}>
          <RotateCcw className="w-3.5 h-3.5" /> Limpiar firma
        </Button>
      </div>
    </div>
  );
};
