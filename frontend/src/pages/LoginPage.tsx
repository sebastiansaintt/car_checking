import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ToastNotification } from '../components/ui/ToastNotification';
import { InstallPrompt } from '../components/pwa/InstallPrompt';
import { ShieldCheck, Car } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (!email || !password) {
      setToastMessage('Por favor ingrese correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión. Verifique sus credenciales';
      setToastMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#1E3A5F] to-[#0F172A] flex flex-col justify-center items-center p-4">
      {/* Toast Notificación Emergente */}
      <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />
      
      {/* Prompt PWA */}
      <InstallPrompt />

      <div className="w-full max-w-md bg-white border border-border rounded-card p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 bg-brand text-white rounded-card flex items-center justify-center shadow-md">
            <Car className="w-8 h-8" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-primary tracking-tight">Car Check</h1>
            <p className="text-xs font-semibold text-brand uppercase tracking-wider">Control & Inspección de Flota</p>
          </div>
          <p className="text-xs text-secondary-text pt-1">
            Ingrese sus credenciales corporativas para acceder a la plataforma
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@carcheck.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" className="w-full bg-brand hover:bg-brand-hover text-white py-2.5 text-sm font-bold shadow-md" isLoading={isLoading}>
              <ShieldCheck className="w-4 h-4" /> Iniciar Sesión
            </Button>
          </div>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-[11px] text-secondary-tertiary text-center">
            Car Check v2.0 — Desarrollado para gestión eficiente de flota
          </p>
        </div>
      </div>
    </div>
  );
};
