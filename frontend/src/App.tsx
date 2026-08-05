import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { TecnicoInspectorDashboard } from './pages/TecnicoInspectorDashboard';
import { JefeInspeccionDashboard } from './pages/JefeInspeccionDashboard';
import { AdministradorDashboard } from './pages/AdministradorDashboard';

const NavigationHandler: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="flex flex-col items-center gap-3">
          {/* Skeleton pulse en lugar de spinner */}
          <div className="w-6 h-6 rounded border border-[#E5E7EB] skeleton" />
          <p className="text-xs text-[#9CA3AF] font-medium tracking-wide">
            Cargando sistema...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (user.rol === 'administrador') return <AdministradorDashboard />;
  if (user.rol === 'tecnico_inspector' || user.rol === 'coordinador') return <TecnicoInspectorDashboard />;
  return <JefeInspeccionDashboard />;
};

function App() {
  return (
    <AuthProvider>
      <NavigationHandler />
    </AuthProvider>
  );
}

export default App;
