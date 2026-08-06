import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  countdown: number;
  onRefresh: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  countdown,
  onRefresh,
}) => {
  if (!isOpen) return null;

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;
  const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl text-slate-100">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-100">¿Sigues ahí?</h3>
          <p className="text-xs text-slate-400 mt-1">
            Por seguridad, tu sesión en CarChecking expira pronto por inactividad.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 py-3 px-4 rounded-xl flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="font-mono text-2xl font-bold text-amber-400 tracking-wider">
            {formattedTime}
          </span>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onRefresh}
          className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-0 shadow-lg shadow-amber-500/20"
        >
          Sí, continuar conectado
        </Button>
      </div>
    </div>
  );
};
