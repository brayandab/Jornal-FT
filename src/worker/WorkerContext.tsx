import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { api } from '../api/endpoints';
import type { WorkerProfile } from '../api/types';
import { useTopic } from '../lib/realtime';
import { centerOf } from '../lib/regions';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { vacancyApi } from '../vacancies/api';
import { friendlyError } from '../api/errors';
import { useVacancyQuery } from '../vacancies/hooks';
import { distanceTo, matchFor } from '../vacancies/logic';
import type { Application, LatLng, NearbyVacancy, Vacancy } from '../vacancies/types';
import { getExtra } from '../vacancies/workerExtra';
import type { WorkerExtra } from '../vacancies/workerExtra';

interface WorkerState {
  profile: WorkerProfile | null;
  profileError: ApiError | null;
  /** Trabajador nuevo: aún no creó su perfil (servicios, radio y ubicación). */
  profileMissing: boolean;
  reloadProfile: () => Promise<void>;
  setAvailable: (v: boolean) => Promise<void>;
  availabilityBusy: boolean;
  base: LatLng;
  hasBase: boolean;
  radiusKm: number;
  /** Vacantes abiertas dentro del radio, de la más recomendada a la menos. */
  nearby: NearbyVacancy[];
  nearbyLoading: boolean;
  nearbyError: ApiError | null;
  reloadNearby: () => void;
  toNearby: (v: Vacancy) => NearbyVacancy;
  apply: (vacancyId: string) => Promise<void>;
  withdraw: (vacancyId: string) => Promise<void>;
  attendance: (vacancyId: string, attending: boolean) => Promise<void>;
  /** Vacante nueva cerca: la avisa el backend por WebSocket (solo a los trabajadores dentro del radio). */
  alert: NearbyVacancy | null;
  dismissAlert: () => void;
  applications: Application[];
  stats: { completed: number; earnedMinor: number; weekMinor: number };
  extra: WorkerExtra | undefined;
  setExtra: (e: WorkerExtra) => void;
  errorText: (e: unknown) => string;
}

const Ctx = createContext<WorkerState | null>(null);

export function WorkerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, region } = useApp();
  const { showToast } = useShell();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [alert, setAlert] = useState<NearbyVacancy | null>(null);
  const [extra, setExtra] = useState<WorkerExtra>();

  useEffect(() => setExtra(user ? getExtra(user.id) : undefined), [user]);

  const errorText = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 0) return t('errors.network');
    return friendlyError(e, t);
  }, [t]);

  const reloadProfile = useCallback(async () => {
    try {
      setProfile(await api.workerProfile());
      setProfileError(null);
      setProfileMissing(false);
    } catch (e) {
      // 404 WRK001: cuenta nueva sin perfil de trabajador; no es una falla, hay que completarlo.
      if (e instanceof ApiError && e.status === 404) {
        setProfileMissing(true);
        setProfileError(null);
      } else {
        setProfileError(e as ApiError);
      }
    }
  }, []);
  useEffect(() => void reloadProfile(), [reloadProfile]);

  const hasBase = profile?.baseLatitude != null && profile.baseLongitude != null;
  const base = useMemo<LatLng>(
    () => (hasBase ? { lat: profile!.baseLatitude!, lng: profile!.baseLongitude! } : centerOf(region)),
    [hasBase, profile, region],
  );
  const radiusKm = profile?.workRadiusKm ?? 10;
  const categoryIds = useMemo(() => profile?.categories?.map((c) => c.id) ?? [], [profile]);

  const toNearby = useCallback((v: Vacancy): NearbyVacancy => {
    const distanceKm = distanceTo(v, base);
    return { vacancy: v, distanceKm, match: matchFor(distanceKm, radiusKm, !!v.categoryId && categoryIds.includes(v.categoryId)) };
  }, [base, radiusKm, categoryIds]);

  const openQ = useVacancyQuery(() => (user ? vacancyApi.open() : Promise.resolve([])), [user?.id]);
  const appsQ = useVacancyQuery(() => (user ? vacancyApi.myApplications() : Promise.resolve([])), [user?.id]);

  const nearby = useMemo(
    () => (openQ.data ?? []).map(toNearby).filter((n) => n.distanceKm <= radiusKm).sort((a, b) => b.match - a.match),
    [openQ.data, toNearby, radiusKm],
  );

  const applications = useMemo(() => appsQ.data ?? [], [appsQ.data]);
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    let completed = 0;
    let earnedMinor = 0;
    let weekMinor = 0;
    for (const a of applications) {
      if (a.status !== 'COMPLETED') continue;
      completed++;
      if (a.payoutStatus !== 'PAID') continue;
      const paid = a.paidAmountMinor ?? a.payoutMinor ?? 0;
      earnedMinor += paid;
      if (a.paidAt && Date.parse(a.paidAt) >= weekAgo) weekMinor += paid;
    }
    return { completed, earnedMinor, weekMinor };
  }, [applications]);

  // Aviso emergente: el backend solo se lo envía a quien tiene la vacante dentro de su radio.
  useTopic(user ? `/topic/users.${user.id}` : null, (body) => {
    const msg = body as { template?: string; vacancyId?: string | null };
    if (msg.template !== 'vacancy.published' || !msg.vacancyId) return;
    vacancyApi.get(msg.vacancyId).then((v) => setAlert(toNearby(v))).catch(() => undefined);
  });

  const setAvailable = useCallback(
    async (v: boolean) => {
      if (!profile) return;
      const previous = profile;
      setProfile({ ...profile, available: v });
      setAvailabilityBusy(true);
      try {
        setProfile(await api.setAvailability(v));
      } catch (e) {
        setProfile(previous);
        showToast({ text: errorText(e) });
      } finally {
        setAvailabilityBusy(false);
      }
    },
    [profile, showToast, errorText],
  );

  const apply = useCallback(async (vacancyId: string) => {
    await vacancyApi.apply(vacancyId);
    if (alert?.vacancy.id === vacancyId) setAlert(null);
    showToast({ text: t('vac.applied'), to: `/vacantes/${vacancyId}`, linkText: t('vac.view') });
  }, [alert, showToast, t]);

  const withdraw = useCallback(async (vacancyId: string) => {
    await vacancyApi.withdraw(vacancyId);
    showToast({ text: t('vac.withdrawn') });
  }, [showToast, t]);

  const attendance = useCallback(async (vacancyId: string, attending: boolean) => {
    await vacancyApi.attendance(vacancyId, attending);
    showToast({ text: attending ? t('vac.attendance.confirmedToast') : t('vac.attendance.declinedToast') });
  }, [showToast, t]);

  const value: WorkerState = {
    profile, profileError, profileMissing, reloadProfile, setAvailable, availabilityBusy, base, hasBase, radiusKm,
    nearby, nearbyLoading: openQ.loading && !openQ.data, nearbyError: openQ.error, reloadNearby: openQ.reload, toNearby,
    apply, withdraw, attendance, alert, dismissAlert: () => setAlert(null), applications, stats,
    extra, setExtra, errorText,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorker(): WorkerState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorker fuera de WorkerProvider');
  return ctx;
}
