import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Notificacion } from '../../types';
import { apiFetch } from '../../lib/api';
import { Bell, CheckCheck, Wrench, AlertTriangle, CheckCircle2, FileText, X } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const isMobile = vw < 640;

    if (isMobile) {
      // En pantallas pequeñas / móviles: ocupar el ancho disponible con márgenes seguros
      const margin = 12;
      const topSpace = rect.top;
      const bottomSpace = vh - rect.bottom;

      if (bottomSpace >= 260 || bottomSpace >= topSpace) {
        // Desplegar hacia abajo
        const top = Math.max(margin, rect.bottom + 8);
        const maxHeight = Math.max(160, vh - top - margin);
        setPopoverStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${margin}px`,
          right: `${margin}px`,
          maxHeight: `${maxHeight}px`,
        });
      } else {
        // Desplegar hacia arriba
        const bottom = Math.max(margin, vh - rect.top + 8);
        const maxHeight = Math.max(160, vh - bottom - margin);
        setPopoverStyle({
          position: 'fixed',
          bottom: `${bottom}px`,
          left: `${margin}px`,
          right: `${margin}px`,
          maxHeight: `${maxHeight}px`,
        });
      }
    } else {
      // En PC / Escritorio (>= 640px)
      const popoverWidth = 380;
      const margin = 16;
      const style: React.CSSProperties = {
        position: 'fixed',
        width: `${Math.min(popoverWidth, vw - margin * 2)}px`,
      };

      // Posicionamiento horizontal
      if (rect.left < vw / 2) {
        // El botón está en la mitad izquierda (por ejemplo, en la barra lateral)
        if (rect.left < 260) {
          // Desplegar a la derecha de la barra lateral (aprox. a partir de 228px)
          const targetLeft = Math.max(rect.right + 12, 228);
          style.left = `${Math.min(targetLeft, vw - popoverWidth - margin)}px`;
        } else {
          style.left = `${Math.max(margin, Math.min(rect.left, vw - popoverWidth - margin))}px`;
        }
      } else {
        // El botón está en la mitad derecha (por ejemplo, header superior a la derecha)
        const rightEdge = vw - rect.right;
        const targetRight = Math.max(margin, rightEdge);
        style.right = `${Math.min(targetRight, vw - popoverWidth - margin)}px`;
      }

      // Posicionamiento vertical
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;

      // Si el botón está en la parte inferior (como en el pie de la barra lateral en PC), abrir hacia arriba
      if (spaceBelow < 320 && spaceAbove > spaceBelow) {
        const bottom = Math.max(margin, vh - rect.top + 8);
        style.bottom = `${bottom}px`;
        style.maxHeight = `${Math.min(520, spaceAbove)}px`;
      } else {
        // Abrir hacia abajo
        const top = Math.max(margin, rect.bottom + 8);
        style.top = `${top}px`;
        style.maxHeight = `${Math.min(520, spaceBelow)}px`;
      }

      setPopoverStyle(style);
    }
  }, []);

  // Recalcular posición cuando se abre o al redimensionar / scrollear
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updatePosition]);

  // Cerrar al hacer clic fuera o pulsar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current && !popoverRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
    <>
      {/* Botón Campana */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-[8px] text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-150 inline-flex items-center justify-center"
        title="Centro de Notificaciones"
        aria-label="Centro de Notificaciones"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[10px] font-semibold text-white bg-[#991B1B] rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover renderizado en Portal para evitar cualquier restricción de contenedor */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop sólo en móviles para facilitar el cierre al pulsar fuera */}
            <div
              className="fixed inset-0 bg-black/20 z-[9998] sm:hidden animate-fade-in"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={popoverRef}
              style={popoverStyle}
              className="fixed flex flex-col bg-white border border-[#E5E7EB] rounded-[12px] shadow-2xl z-[9999] overflow-hidden text-xs animate-fade-in"
            >
              {/* Header Popover */}
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-white">
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
                    aria-label="Cerrar notificaciones"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lista de Notificaciones */}
              <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-[#F3F4F6]">
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
                        'px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors duration-150',
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
                        <p className="text-[11px] text-[#6B7280] leading-relaxed break-words">{n.mensaje}</p>
                      </div>
                      {!n.leida && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F] shrink-0 mt-1.5" title="No leída" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
};
