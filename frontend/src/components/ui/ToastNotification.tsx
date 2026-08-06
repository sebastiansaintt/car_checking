import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

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
  duration = 4500,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in max-w-md w-[92vw] sm:w-auto"
      role="alert"
      aria-live="polite"
    >
      <div
        className={[
          'flex items-start gap-3 px-4 py-3',
          'rounded-card border bg-white shadow-2xl',
          'w-full sm:max-w-md',
          isError ? 'border-[#FCA5A5] text-[#991B1B]' : 'border-[#A7F3D0] text-[#065F46]',
        ].join(' ')}
      >
        <div className="shrink-0 pt-0.5">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-[#991B1B]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
          )}
        </div>
        <p className="flex-1 text-sm text-[#111827] leading-snug">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 p-0.5 rounded text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-150"
          type="button"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
