import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

export interface AsyncState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (d: T) => void;
}

function asApiError(e: unknown): ApiError {
  return e instanceof ApiError ? e : new ApiError({ status: 0, code: 'UNKNOWN', detail: String(e) });
}

/** Carga datos al montar (y cuando cambian las dependencias). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(asApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}

/** Acción del usuario (enviar un formulario, pulsar un botón) con su estado y error. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setBusy(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(asApiError(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [fn],
  );
  return { run, busy, error, setError };
}

/** Repite una función cada `ms` mientras el componente está montado. */
export function useInterval(fn: () => void, ms: number | null) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
