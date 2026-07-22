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
      return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />;
    }
    if (tipo.includes('apto') || tipo.includes('completado')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (tipo.includes('mantenimiento')) {
      return <Wrench className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-gray-500 shrink-0" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-secondary-text hover:text-primary hover:bg-gray-100 transition-colors focus:outline-none"
        title="Centro de Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-border rounded-dialog shadow-lg z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Popover */}
          <div className="p-3 bg-surface-subtle border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Bell className="w-4 h-4 text-brand" />
              <span>Notificaciones</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-brand/10 text-brand font-bold text-[10px]">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-brand hover:underline flex items-center gap-1 font-medium pr-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Leer todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-secondary-tertiary hover:text-primary hover:bg-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notificaciones.length === 0 ? (
              <div className="p-8 text-center text-secondary-tertiary">
                No tienes notificaciones recientes.
              </div>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.leida && handleMarkAsRead(n.id)}
                  className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                    n.leida ? 'bg-white hover:bg-gray-50/50' : 'bg-blue-50/40 hover:bg-blue-50/80 font-medium'
                  }`}
                >
                  <div className="pt-0.5">{getNotifIcon(n.tipo)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs ${n.leida ? 'text-primary' : 'font-bold text-primary'}`}>{n.titulo}</h5>
                      <span className="text-[10px] text-secondary-tertiary font-mono shrink-0">
                        {new Date(n.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary-text leading-relaxed">{n.mensaje}</p>
                  </div>
                  {!n.leida && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1" title="No leída" />
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
