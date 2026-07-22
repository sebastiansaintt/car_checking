import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'danger':
      case 'warning':
        return <AlertTriangle className={`w-8 h-8 ${variant === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-emerald-500" />;
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3 bg-surface-subtle border border-border rounded-input">
          <div className="shrink-0">{getIcon()}</div>
          <p className="text-secondary-text leading-relaxed text-xs pt-1">{message}</p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'outline' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={variant === 'danger' ? 'border-red-500 text-red-600 hover:bg-red-50' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
