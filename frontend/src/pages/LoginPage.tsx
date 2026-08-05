import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ToastNotification } from '../components/ui/ToastNotification';
import { InstallPrompt } from '../components/pwa/InstallPrompt';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!email || !password) {
      setToast({ message: 'Ingrese correo electrónico y contraseña.', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciales incorrectas. Verifique e intente de nuevo.';
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ToastNotification
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
      <InstallPrompt />

      {/* Pantalla dividida: contenido centrado en fondo claro */}
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-[340px]">

          {/* Marca */}
          <div className="mb-8 flex flex-col items-start gap-2">
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-semibold text-[#111827] leading-tight tracking-tight">
                CarCheck
              </h1>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Sistema de Inspección — Sointer Ltda.
              </p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-3">
              <Input
                label="Correo electrónico"
                type="email"
                id="login-email"
                placeholder="nombre@sointer.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              <Input
                label="Contraseña"
                type="password"
                id="login-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              id="login-submit"
            >
              Iniciar sesión
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-[11px] text-[#D1D5DB] text-center">
            v2.0 · Solo para personal autorizado
          </p>
        </div>
      </div>
    </>
  );
};
