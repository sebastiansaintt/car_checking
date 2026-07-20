import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CoordinadorDashboard } from './pages/CoordinadorDashboard';
import { GerenteDashboard } from './pages/GerenteDashboard';

const NavigationHandler: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-subtle">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-medium text-secondary-text">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.rol === 'coordinador') {
    return <CoordinadorDashboard />;
  }

  return <GerenteDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <NavigationHandler />
    </AuthProvider>
  );
}

export default App;
