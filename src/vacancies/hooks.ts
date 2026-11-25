import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { subscribe } from './mockStore';

/**
 * Carga datos de la capa de vacantes y los vuelve a cargar cuando cambian (en esta pestaña o en otra).
 * Cuando exista el backend, el aviso de cambio llegará por el WebSocket de notificaciones.
 */
export function useVacancyQuery<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let alive = true;
    fn()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error & { code?: string }) => {
        if (alive) setError(new ApiError({ status: 404, code: e.code ?? 'ERROR', detail: '' }));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload: () => setTick((n) => n + 1) };
}

/** Código de error de la capa de vacantes (mismo formato que tendrá el ProblemDetail del backend). */
export function vacancyErrorCode(e: unknown): string {
  return (e as { code?: string })?.code ?? 'ERROR';
}
