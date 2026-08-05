import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('car_check_pwa_dismissed');
    if (dismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowPrompt(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('El usuario aceptó instalar la PWA de Car Check.');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('car_check_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-white text-[#111827] p-4 rounded-container shadow-modal border border-[#E5E7EB] z-50 flex items-start gap-3 animate-fade-in">
      <div className="p-2 bg-[#FAFAFA] text-[#1E3A5F] border border-[#E5E7EB] rounded-container shrink-0">
        <Smartphone className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <h5 className="font-semibold text-[#111827] text-xs">Instalar aplicación</h5>
          <button onClick={handleDismiss} className="text-[#9CA3AF] hover:text-[#111827] p-0.5 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[#6B7280] text-[11px] leading-relaxed">
          Instala CarCheck para un acceso rápido y uso sin conexión.
        </p>
        <div className="pt-2 flex gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#1E3A5F] hover:bg-[#142843] text-white font-medium rounded-button text-[11px] flex items-center gap-1.5 transition-colors duration-150"
          >
            <Download className="w-3.5 h-3.5" /> Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 text-[#6B7280] hover:text-[#111827] text-[11px] font-medium transition-colors duration-150"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
};
