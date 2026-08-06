import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch, API_BASE_URL } from '../lib/api';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { SessionTimeoutModal } from '../components/ui/SessionTimeoutModal';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar error al limpiar localmente
    } finally {
      setUser(null);
    }
  };

  // Session Timeout Hook (S3.2 - S3.4)
  const { showWarning, countdown, handleRefreshSession } = useSessionTimeout({
    isAuthenticated: !!user,
    onLogout: () => {
      setUser(null);
    },
  });

  // Listener para cerrar sesión al cerrar pestaña/navegador vía Beacon API (S3.5)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        const url = `${API_BASE_URL}/auth/logout-beacon`;
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Verificar sesión activa al montar el componente
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await apiFetch<User>('/auth/me');
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const loggedUser = await apiFetch<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(loggedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
      <SessionTimeoutModal
        isOpen={showWarning}
        countdown={countdown}
        onRefresh={handleRefreshSession}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
