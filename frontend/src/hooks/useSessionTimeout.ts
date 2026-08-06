import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';

interface UseSessionTimeoutProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  timeoutMinutes?: number; // Default 60 mins
  warningMinutes?: number; // Default 2 mins before expiry
}

export function useSessionTimeout({
  isAuthenticated,
  onLogout,
  timeoutMinutes = 60,
  warningMinutes = 2,
}: UseSessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(warningMinutes * 60);

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const startWarningTimer = useCallback(() => {
    clearAllTimers();
    if (!isAuthenticated) return;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(warningMinutes * 60);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            setShowWarning(false);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningMs);
  }, [isAuthenticated, warningMs, warningMinutes, onLogout, clearAllTimers]);

  const handleRefreshSession = useCallback(async () => {
    try {
      await apiFetch('/auth/refresh', { method: 'POST' });
      setShowWarning(false);
      startWarningTimer();
    } catch (err) {
      onLogout();
    }
  }, [onLogout, startWarningTimer]);

  useEffect(() => {
    if (isAuthenticated) {
      startWarningTimer();
    } else {
      clearAllTimers();
      setShowWarning(false);
    }
    return () => clearAllTimers();
  }, [isAuthenticated, startWarningTimer, clearAllTimers]);

  // Listener para resetear timer por actividad con debounce cuando NO está el modal visible
  useEffect(() => {
    if (!isAuthenticated || showWarning) return;

    let debounceTimer: NodeJS.Timeout;
    const handleUserActivity = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        startWarningTimer();
      }, 1000);
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    return () => {
      clearTimeout(debounceTimer);
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
    };
  }, [isAuthenticated, showWarning, startWarningTimer]);

  return {
    showWarning,
    countdown,
    handleRefreshSession,
  };
}
