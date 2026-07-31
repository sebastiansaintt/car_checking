import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { TecnicoInspectorDashboard } from './pages/TecnicoInspectorDashboard';
import { GerenteDashboard } from './pages/GerenteDashboard';

const NavigationHandler: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-400">Cargando Sistema de Inspección Sointer Ltda...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.rol === 'tecnico_inspector' || user.rol === 'coordinador') {
    return <TecnicoInspectorDashboard />;
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
