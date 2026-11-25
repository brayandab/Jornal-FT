import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/endpoints';
import { CITY, centerOf } from '../lib/regions';
import { useApp } from '../state/AppContext';
import { seedIfNeeded, setStoreRegion, subscribe, vacancyApi } from '../vacancies/mockStore';
import type { Employer } from '../vacancies/types';

export interface Toast { text: string; to?: string; linkText?: string }

interface ShellState {
  toast: Toast | null;
  showToast: (t: Toast) => void;
  /** Avisos sin leer del flujo de vacantes + bandeja del backend. */
  unread: number;
  refreshUnread: () => void;
  /** Quien contrata (persona o comercio), armado con los datos reales de la cuenta. */
  employer: Employer | null;
  storeReady: boolean;
}

const Ctx = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const { user, region, profile, locale } = useApp();
  const [toast, setToast] = useState<Toast | null>(null);
  const [unread, setUnread] = useState(0);
  const [storeReady, setStoreReady] = useState(false);
  const [legalName, setLegalName] = useState<string | undefined>();
  // Antes de la primera consulta de cualquier pantalla: la capa simulada guarda por región.
  if (region) setStoreRegion(region);

  // La capa simulada guarda por región y siembra vacantes de ejemplo con el catálogo real del país.
  useEffect(() => {
    if (!region || !profile || !user) return;
    let alive = true;
    api
      .categories()
      .then((cats) => seedIfNeeded(centerOf(region), cats, profile, CITY[region] ?? ''))
      .catch(() => undefined)
      .finally(() => alive && setStoreReady(true));
    return () => {
      alive = false;
    };
  }, [region, profile, user, locale]);

  useEffect(() => {
    if (user?.rol === 'BUSINESS') api.business().then((b) => setLegalName(b.legalName)).catch(() => undefined);
  }, [user]);

  const refreshUnread = useCallback(() => {
    if (!user) return;
    Promise.all([
      vacancyApi.notices(user.id).then((n) => n.filter((x) => !x.read).length),
      api.inbox(50).then((n) => n.filter((x) => !x.readAt).length).catch(() => 0),
    ]).then(([a, b]) => setUnread(a + b));
  }, [user]);

  useEffect(() => {
    refreshUnread();
    return subscribe(refreshUnread);
  }, [refreshUnread, storeReady]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const employer = useMemo<Employer | null>(
    () =>
      user && (user.rol === 'APPLICANT' || user.rol === 'BUSINESS')
        ? {
            id: user.id, name: legalName ?? user.name, legalName, kind: user.rol === 'BUSINESS' ? 'BUSINESS' : 'PERSON',
            ratingAvg: 0, ratingCount: 0, verified: user.verificationState === 'VERIFIED',
          }
        : null,
    [user, legalName],
  );

  const value = useMemo(
    () => ({ toast, showToast: setToast, unread, refreshUnread, employer, storeReady }),
    [toast, unread, refreshUnread, employer, storeReady],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShell fuera de ShellProvider');
  return ctx;
}
