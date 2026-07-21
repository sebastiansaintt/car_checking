import { useState, useEffect, useCallback } from 'react';
import { getOfflineInspecciones, deleteOfflineInspeccion } from '../lib/offlineQueue';
import { apiFetch } from '../lib/api';

export function useOfflineSync(onSyncComplete?: (count: number) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkPending = useCallback(async () => {
    try {
      const items = await getOfflineInspecciones();
      setPendingCount(items.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      const items = await getOfflineInspecciones();
      if (items.length === 0) return;

      setIsSyncing(true);
      let synced = 0;

      for (const item of items) {
        try {
          await apiFetch('/inspecciones', {
            method: 'POST',
            headers: {
              'X-Idempotency-Key': item.id,
            },
            body: JSON.stringify(item.payload),
          });
          await deleteOfflineInspeccion(item.id);
          synced++;
        } catch (err) {
          console.error(`Error al sincronizar elemento ${item.id}:`, err);
        }
      }

      await checkPending();
      if (synced > 0 && onSyncComplete) {
        onSyncComplete(synced);
      }
    } catch (err) {
      console.error('Error durante la sincronización de la cola:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, checkPending, onSyncComplete]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPending();
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, checkPending]);

  return { isOnline, isSyncing, pendingCount, checkPending, syncQueue };
}
