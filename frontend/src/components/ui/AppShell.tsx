import React, { useState, useEffect } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Slots opcionales */
  headerRight?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  navItems,
  activeTab,
  onTabChange,
  headerRight,
}) => {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const roleLabel: Record<string, string> = {
    administrador:     'Administrador',
    jefe_inspeccion:   'Jefe de Inspección',
    tecnico_inspector: 'Técnico Inspector',
    coordinador:       'Técnico Inspector',
    gerente:           'Jefe de Inspección',
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsMobileOpen(false);
  }, [activeTab]);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleNavClick = (id: string) => {
    onTabChange(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Sidebar overlay (mobile) ───────────────────────── */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={[
          'app-sidebar',
          isMobileOpen ? 'mobile-open' : '',
        ].join(' ')}
      >
        {/* Logo + Brand */}
        <div className="px-4 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-[#111827] tracking-tight block">CarCheck</span>
              <span className="text-[11px] text-[#9CA3AF] block leading-tight">Sointer Ltda.</span>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-[#F3F4F6]">
          <p className="text-xs font-medium text-[#111827] leading-tight truncate">{user?.nombre}</p>
          <p className="text-[11px] text-[#9CA3AF] leading-tight">
            {user?.rol ? (roleLabel[user.rol] ?? user.rol) : ''}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={[
                'sidebar-nav-item w-full',
                activeTab === item.id ? 'active' : '',
              ].join(' ')}
            >
              <span className="w-4 h-4 shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer — notifications + logout */}
        <div className="px-3 py-3 border-t border-[#E5E7EB] space-y-1">
          {headerRight && (
            <div className="px-3 py-1.5">{headerRight}</div>
          )}
          <button
            onClick={logout}
            className="sidebar-nav-item w-full text-[#9CA3AF] hover:text-[#991B1B]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────── */}
      <div className="app-main">
        {/* Mobile topbar */}
        <div className="mobile-topbar md:hidden">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-[8px] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors duration-150"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-[#111827] tracking-tight">CarCheck</span>
          <div className="ml-auto flex items-center gap-2">
            {headerRight}
          </div>
        </div>

        {/* Content */}
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};
