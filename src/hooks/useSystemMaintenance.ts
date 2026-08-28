// frontend/src/hooks/useSystemMaintenance.ts
// Polls the public maintenance status endpoint and updates the global
// appBlockedStore so the full-app maintenance overlay can show immediately.

import { useEffect } from 'react';
import { useAppBlockedStore } from '../store/appBlockedStore';
import apiClient from '../lib/apiClient';

const POLL_MS = 30_000;

export function useSystemMaintenance({ enabled = true }: { enabled?: boolean } = {}) {
  const setBlocked = useAppBlockedStore((s) => s.setBlocked);
  const clearBlocked = useAppBlockedStore((s) => s.clearBlocked);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function check() {
      try {
        const res = await apiClient.get<{ maintenanceMode: boolean; message?: string }>(
          '/system/maintenance'
        );
        if (!active) return;
        if (res.data?.maintenanceMode) {
          setBlocked('MAINTENANCE', res.data.message);
        } else {
          // Only clear MAINTENANCE — never clear DEACTIVATED/BANNED.
          const cur = useAppBlockedStore.getState();
          if (cur.type === 'MAINTENANCE') clearBlocked();
        }
      } catch {
        // Ignore transient errors; keep current state.
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, setBlocked, clearBlocked]);
}