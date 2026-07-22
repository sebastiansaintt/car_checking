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
    // Si la app ya está instalada o fue descartada previamente
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-gray-900 text-white p-4 rounded-card shadow-xl border border-gray-800 z-50 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-2.5 bg-brand text-white rounded-container shrink-0">
        <Smartphone className="w-5 h-5" />
      </div>
      <div className="flex-1 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <h5 className="font-bold text-white text-xs">Instalar Car Check App</h5>
          <button onClick={handleDismiss} className="text-gray-400 hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-gray-300 text-[11px] leading-relaxed">
          Instala la aplicación en tu pantalla de inicio para un acceso rápido y uso optimizado sin conexión.
        </p>
        <div className="pt-2 flex gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white font-bold rounded-button text-[11px] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Instalar App
          </button>
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1.5 text-gray-400 hover:text-white text-[11px] font-medium transition-colors"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
};
