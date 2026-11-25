import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ApiError, restoreSession, session, tokenClaims } from '../api/client';
import { api } from '../api/endpoints';
import type { RegionProfile, Role, User } from '../api/types';
import i18n, { resolveUiLocale } from '../i18n';
import { formatMoney } from '../lib/format';

interface AppState {
  region: string | null;
  locale: string;
  profile: RegionProfile | null;
  profileError: ApiError | null;
  user: User | null;
  role: Role | null;
  /** Restaurando la sesión tras recargar la página. */
  booting: boolean;
  chooseRegion: (region: string, locale: string) => Promise<void>;
  setLocale: (locale: string) => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

function applyLocale(locale: string) {
  void i18n.changeLanguage(resolveUiLocale(locale));
  document.documentElement.lang = locale;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(session.subscribe, session.get);
  const [profile, setProfile] = useState<RegionProfile | null>(null);
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const region = snap.region;
  const locale = snap.locale ?? 'en-US';
  const claims = tokenClaims(snap.accessToken);
  const role = (claims?.role as Role | undefined) ?? user?.rol ?? null;

  useEffect(() => applyLocale(locale), [locale]);

  const loadProfile = useCallback(async (r: string) => {
    try {
      setProfileError(null);
      setProfile(await api.regionProfile(r));
    } catch (e) {
      setProfile(null);
      setProfileError(e instanceof ApiError ? e : new ApiError({ status: 0, code: 'NETWORK' }));
    }
  }, []);

  useEffect(() => {
    if (region) void loadProfile(region);
    else setProfile(null);
  }, [region, loadProfile]);

  // Al recargar: si hay refresh token, se pide un access token nuevo y los datos del usuario.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (session.get().refreshToken && (await restoreSession())) {
        try {
          const me = await api.me();
          if (alive) setUser(me);
        } catch {
          session.clearTokens();
        }
      }
      if (alive) setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Si el refresh falla en cualquier petición, la sesión se cierra.
  useEffect(() => {
    if (!snap.accessToken && !snap.refreshToken) setUser(null);
  }, [snap.accessToken, snap.refreshToken]);

  const chooseRegion = useCallback(async (r: string, l: string) => {
    if (session.get().region !== r) session.clearTokens();
    session.set({ region: r, locale: l });
  }, []);

  const setLocale = useCallback((l: string) => {
    session.set({ locale: l });
    // El idioma preferido también se guarda en la cuenta (los avisos llegan en ese idioma).
    if (session.get().accessToken) void api.updateMe({ locale: l }).then(setUser).catch(() => undefined);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    session.setTokens(await api.login(email, password));
    const me = await api.me();
    setUser(me);
    if (me.locale) session.set({ locale: me.locale });
    return me;
  }, []);

  const logout = useCallback(async () => {
    const rt = session.get().refreshToken;
    if (rt) await api.logout(rt).catch(() => undefined);
    session.clearTokens();
    setUser(null);
  }, []);

  const reloadUser = useCallback(async () => setUser(await api.me()), []);
  const reloadProfile = useCallback(async () => {
    if (session.get().region) await loadProfile(session.get().region!);
  }, [loadProfile]);

  const value = useMemo<AppState>(
    () => ({
      region, locale, profile, profileError, user, role: user ? role : null, booting,
      chooseRegion, setLocale, login, logout, reloadUser, reloadProfile,
    }),
    [region, locale, profile, profileError, user, role, booting, chooseRegion, setLocale, login, logout, reloadUser, reloadProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp fuera de AppProvider');
  return ctx;
}

/** Atajos de formato con el idioma y el perfil del país actual. */
export function useMoney() {
  const { locale, profile } = useApp();
  return useCallback(
    (minor: number | null | undefined, currency?: string, moneyScale?: number) =>
      formatMoney(
        minor,
        { currency: currency ?? profile?.currency ?? 'USD', moneyScale: moneyScale ?? profile?.moneyScale ?? 2 },
        locale,
      ),
    [locale, profile],
  );
}
