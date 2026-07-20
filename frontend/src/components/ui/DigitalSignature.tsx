import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './Button';
import { RotateCcw, CheckCircle } from 'lucide-react';

interface SignatureProps {
  onSave: (dataUrl: string) => void;
  initialFirma?: string;
}

export const DigitalSignature: React.FC<SignatureProps> = ({ onSave, initialFirma }) => {
  const sigPad = useRef<SignatureCanvas | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(!!initialFirma);
  const [signaturePreview, setSignaturePreview] = useState<string>(initialFirma || '');
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  const handleClear = () => {
    sigPad.current?.clear();
    setIsConfirmed(false);
    setSignaturePreview('');
    setHasDrawn(false);
    onSave('');
  };

  const handleConfirm = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      setSignaturePreview(dataUrl);
      setIsConfirmed(true);
      onSave(dataUrl);
    }
  };

  const handleStrokeEnd = () => {
    if (sigPad.current && !sigPad.current.isEmpty()) {
      setHasDrawn(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isConfirmed && signaturePreview ? (
        <div className="p-4 border border-status-apto-border bg-status-apto-bg rounded-input flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-status-apto-text text-xs font-semibold">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Firma Digital Capturada y Confirmada</span>
          </div>
          <div className="bg-white border border-border p-1.5 rounded-input">
            <img src={signaturePreview} alt="Firma Confirmada" className="h-14 object-contain" />
          </div>
          <Button variant="outline" size="sm" type="button" onClick={handleClear}>
            <RotateCcw className="w-3.5 h-3.5" /> Volver a Firmar
          </Button>
        </div>
      ) : (
        <>
          <div className="border border-border rounded-input overflow-hidden bg-white touch-none">
            <SignatureCanvas
              ref={sigPad}
              penColor="#111827"
              canvasProps={{
                className: 'w-full h-36 border-none cursor-crosshair',
              }}
              onEnd={handleStrokeEnd}
            />
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs text-secondary-text">Trace su firma con el dedo o puntero</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" type="button" onClick={handleClear}>
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleConfirm}
                disabled={!hasDrawn}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Confirmar Firma
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
