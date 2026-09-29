import { useEffect, useState } from 'react';
import api from '../services/api';

export function useIaStatus() {
  const [status, setStatus] = useState({ activo: null, modelo: 'IA local' });
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data } = await api.get('/ia/status', { signal: controller.signal, timeout: 5000 });
        if (!controller.signal.aborted) setStatus(data);
      } catch {
        if (!controller.signal.aborted) setStatus({ activo: false, modelo: 'IA local' });
      }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { clearInterval(timer); controller.abort(); };
  }, []);
  return status;
}
