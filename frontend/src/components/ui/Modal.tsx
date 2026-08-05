import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-2xl',
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={[
          'bg-white border border-[#E5E7EB] rounded-dialog shadow-modal',
          'w-full flex flex-col max-h-[90vh] overflow-hidden',
          'animate-fade-in',
          maxWidth,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex flex-col gap-0.5">
            <h2
              id="modal-title"
              className="text-sm font-semibold text-[#111827] leading-snug"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-[#6B7280]">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-150 shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer opcional */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2 bg-[#FAFAFA]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
