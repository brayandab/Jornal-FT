import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { onVacancyChange } from './events';

/**
 * Carga datos de vacantes y los vuelve a cargar cuando cambian: por una acción propia o por un aviso
 * del WebSocket de notificaciones.
 */
export function useVacancyQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => onVacancyChange(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let alive = true;
    fn()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'ERROR', detail: '' }));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((n) => n + 1) };
}

