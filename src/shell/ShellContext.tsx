import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/endpoints';
import { useTopic } from '../lib/realtime';
import { useApp } from '../state/AppContext';
import { resetVacancyCaches } from '../vacancies/api';
import { emitVacancyChange } from '../vacancies/events';
import type { Employer } from '../vacancies/types';

export interface Toast { text: string; to?: string; linkText?: string }

interface ShellState {
  toast: Toast | null;
  showToast: (t: Toast) => void;
  /** Avisos sin leer de la bandeja del backend. */
  unread: number;
  refreshUnread: () => void;
  /** Quien contrata (persona o comercio): razón social si es comercio. */
  employer: Employer | null;
}

const Ctx = createContext<ShellState | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const { user, locale } = useApp();
  const [toast, setToast] = useState<Toast | null>(null);
  const [unread, setUnread] = useState(0);
  const [legalName, setLegalName] = useState<string | undefined>();

  // Al cambiar de idioma se vuelven a pedir las vacantes: el backend las devuelve traducidas a ese idioma.
  useEffect(() => {
    resetVacancyCaches();
    emitVacancyChange();
  }, [locale]);

  useEffect(() => {
    if (user?.rol === 'BUSINESS') api.business().then((b) => setLegalName(b.legalName)).catch(() => undefined);
  }, [user]);

  const refreshUnread = useCallback(() => {
    if (!user) return;
    api.inbox(50).then((n) => setUnread(n.filter((x) => !x.readAt).length)).catch(() => undefined);
  }, [user]);

  useEffect(() => refreshUnread(), [refreshUnread]);

  // Cada aviso que llega en vivo (vacante cercana, contratado, confirmó asistencia, pago...) refresca las pantallas.
  useTopic(user ? `/topic/users.${user.id}` : null, () => {
    refreshUnread();
    emitVacancyChange();
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const employer = useMemo<Employer | null>(
    () => (user && (user.rol === 'APPLICANT' || user.rol === 'BUSINESS') ? { id: user.id, name: legalName ?? user.name } : null),
    [user, legalName],
  );

  const value = useMemo(
    () => ({ toast, showToast: setToast, unread, refreshUnread, employer }),
    [toast, unread, refreshUnread, employer],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShell fuera de ShellProvider');
  return ctx;
}
