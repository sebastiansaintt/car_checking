import React, { useState, useEffect, useRef } from 'react';
import { Notificacion } from '../../types';
import { apiFetch } from '../../lib/api';
import { Bell, CheckCheck, Wrench, AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotificaciones = async () => {
    try {
      const [listData, countData] = await Promise.all([
        apiFetch<Notificacion[]>('/notificaciones?limit=20'),
        apiFetch<{ unread_count: number }>('/notificaciones/no-leidas/count')
      ]);
      setNotificaciones(listData);
      setUnreadCount(countData.unread_count);
    } catch {
      // Ignorar errores silenciosamente en el polling
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    // Polling cada 30 segundos
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiFetch(`/notificaciones/${id}/leer`, { method: 'PUT' });
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiFetch('/notificaciones/leer-todas', { method: 'PUT' });
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getNotifIcon = (tipo: string) => {
    if (tipo.includes('no_apto') || tipo.includes('vencido') || tipo.includes('eliminada')) {
      return <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0" />;
    }
    if (tipo.includes('apto') || tipo.includes('completado')) {
      return <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />;
    }
    if (tipo.includes('mantenimiento')) {
      return <Wrench className="w-4 h-4 text-[#1E40AF] shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-[#6B7280] shrink-0" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-[8px] text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-150"
        title="Centro de Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold text-white bg-[#991B1B] rounded">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[88vw] bg-white border border-[#E5E7EB] rounded-dropdown shadow-modal z-50 overflow-hidden text-xs animate-fade-in">
          {/* Header Popover */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-[#111827]">
              <Bell className="w-3.5 h-3.5 text-[#6B7280]" />
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] font-medium text-[10px]">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-[#6B7280] hover:text-[#111827] flex items-center gap-1 font-medium pr-1 transition-colors duration-150"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Leer todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-150"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="px-4 py-10 text-center text-[#9CA3AF]">
                No tienes notificaciones recientes.
              </div>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.leida && handleMarkAsRead(n.id)}
                  className={[
                    'px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors duration-150 border-b border-[#F3F4F6] last:border-b-0',
                    n.leida
                      ? 'bg-white hover:bg-[#FAFAFA]'
                      : 'bg-[#FAFAFA] hover:bg-[#F3F4F6]',
                  ].join(' ')}
                >
                  <div className="pt-0.5">{getNotifIcon(n.tipo)}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs truncate ${n.leida ? 'text-[#111827]' : 'font-semibold text-[#111827]'}`}>
                        {n.titulo}
                      </h5>
                      <span className="text-[10px] text-[#9CA3AF] font-mono shrink-0">
                        {new Date(n.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">{n.mensaje}</p>
                  </div>
                  {!n.leida && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] shrink-0 mt-1.5" title="No leída" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
