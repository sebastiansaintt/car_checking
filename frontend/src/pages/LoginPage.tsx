import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Truck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState<string>('coordinador@carchecking.com');
  const [password, setPassword] = useState<string>('coord123');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-card p-8 shadow-sm space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 bg-primary text-white rounded-container flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-primary">Inspección de Flota</h1>
          <p className="text-xs text-secondary-text">Ingrese sus credenciales registradas para ingresar</p>
        </div>

        {error && (
          <div className="p-3 bg-status-no_apto-bg border border-status-no_apto-border text-status-no_apto-text rounded-input text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@carchecking.com"
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
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              <ShieldCheck className="w-4 h-4" /> Iniciar Sesión
            </Button>
          </div>
        </form>

        <div className="border-t border-border pt-4 text-center">
          <p className="text-[11px] text-secondary-tertiary">
            Sistema Monolítico PWA · Piloto Interno v1.0
          </p>
        </div>
      </div>
    </div>
  );
};
