import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'error' | 'success';
  onClose: () => void;
  duration?: number;
}

export const ToastNotification: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200">
      <div
        className={`flex items-center justify-between p-3.5 rounded-card border shadow-lg ${
          isError
            ? 'bg-status-no_apto-bg border-status-no_apto-border text-status-no_apto-text'
            : 'bg-status-apto-bg border-status-apto-border text-status-apto-text'
        }`}
      >
        <div className="flex items-center gap-2.5 text-xs font-medium">
          {isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          )}
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:opacity-75 transition-opacity rounded-md text-current"
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
