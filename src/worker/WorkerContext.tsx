import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/client';
import { api } from '../api/endpoints';
import type { WorkerProfile } from '../api/types';
import { centerOf } from '../lib/regions';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { useVacancyQuery, vacancyErrorCode } from '../vacancies/hooks';
import { vacancyApi } from '../vacancies/mockStore';
import type { WorkerExtra } from '../vacancies/mockStore';
import type { Applicant, LatLng, NearbyVacancy } from '../vacancies/types';

interface WorkerState {
  profile: WorkerProfile | null;
  profileError: ApiError | null;
  reloadProfile: () => Promise<void>;
  setAvailable: (v: boolean) => Promise<void>;
  availabilityBusy: boolean;
  base: LatLng;
  radiusKm: number;
  /** Vacantes abiertas dentro del radio, de la más recomendada a la menos. */
  nearby: NearbyVacancy[];
  nearbyLoading: boolean;
  nearbyError: ApiError | null;
  reloadNearby: () => void;
  apply: (nv: NearbyVacancy) => Promise<void>;
  withdraw: (vacancyId: string) => Promise<void>;
  /** Vacante cercana nueva: abre la alerta de recomendación. */
  alert: NearbyVacancy | null;
  dismissAlert: () => void;
  stats: { completed: number; earnedMinor: number; weekMinor: number } | undefined;
  extra: WorkerExtra | undefined;
  errorText: (e: unknown) => string;
}

const Ctx = createContext<WorkerState | null>(null);

export function WorkerProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, region } = useApp();
  const { showToast } = useShell();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [profileError, setProfileError] = useState<ApiError | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [alert, setAlert] = useState<NearbyVacancy | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const errorText = useCallback(
    (e: unknown) => {
      const code = e instanceof ApiError ? e.code ?? '' : vacancyErrorCode(e);
      const known = ['VACANCY_NOT_OPEN', 'ALREADY_APPLIED', 'CANNOT_WITHDRAW', 'VACANCY_NOT_FOUND'];
      if (known.includes(code)) return t(`vac.errors.${code}`);
      if (e instanceof ApiError && e.problem.detail) return e.problem.detail;
      if (e instanceof ApiError && e.status === 0) return t('errors.network');
      return t('errors.generic');
    },
    [t],
  );

  const reloadProfile = useCallback(async () => {
    try {
      setProfile(await api.workerProfile());
      setProfileError(null);
    } catch (e) {
      setProfileError(e as ApiError);
    }
  }, []);
  useEffect(() => void reloadProfile(), [reloadProfile]);

  const base = useMemo<LatLng>(
    () =>
      profile?.baseLatitude != null && profile.baseLongitude != null
        ? { lat: profile.baseLatitude, lng: profile.baseLongitude }
        : centerOf(region),
    [profile, region],
  );
  const radiusKm = profile?.workRadiusKm ?? 10;
  const categoryIds = useMemo(() => profile?.categories?.map((c) => c.id) ?? [], [profile]);

  const nearbyQ = useVacancyQuery(
    () => (user ? vacancyApi.nearby(user.id, base, radiusKm, categoryIds) : Promise.resolve([])),
    [user?.id, base.lat, base.lng, radiusKm, categoryIds.join(',')],
  );
  const statsQ = useVacancyQuery(() => (user ? vacancyApi.workerStats(user.id) : Promise.resolve(undefined)), [user?.id]);
  const extraQ = useVacancyQuery(() => (user ? vacancyApi.getExtra(user.id) : Promise.resolve(undefined)), [user?.id]);
  const nearby = useMemo(() => nearbyQ.data ?? [], [nearbyQ.data]);

  // Alerta: la primera carga no cuenta; después, cada vacante cercana nueva (sin postulación) abre la recomendación.
  useEffect(() => {
    if (nearbyQ.loading || !nearbyQ.data) return;
    if (seen.current === null) {
      seen.current = new Set(nearby.map((n) => n.vacancy.id));
      return;
    }
    const fresh = nearby.find((n) => !seen.current!.has(n.vacancy.id) && !n.mine);
    nearby.forEach((n) => seen.current!.add(n.vacancy.id));
    if (fresh && profile?.available && !alert) setAlert(fresh);
  }, [nearby, nearbyQ.loading, nearbyQ.data, profile, alert]);

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

  const apply = useCallback(
    async (nv: NearbyVacancy) => {
      if (!user) return;
      const extra = extraQ.data;
      const applicant: Applicant = {
        workerId: user.id, name: user.name, ratingAvg: profile?.ratingAvg ?? 0, ratingCount: profile?.ratingCount ?? 0,
        completedJobs: statsQ.data?.completed ?? 0, bio: profile?.bio ?? '', experience: extra?.experience ?? '',
        skills: extra?.skills ?? [], categoryIds, phone: user.phone ?? undefined, simulated: false,
      };
      await vacancyApi.apply(nv.vacancy.id, applicant, nv.distanceKm);
      if (alert?.vacancy.id === nv.vacancy.id) setAlert(null);
      showToast({ text: t('vac.applied'), to: `/vacantes/${nv.vacancy.id}`, linkText: t('vac.view') });
    },
    [user, profile, extraQ.data, statsQ.data, categoryIds, alert, showToast, t],
  );

  const withdraw = useCallback(
    async (vacancyId: string) => {
      if (!user) return;
      await vacancyApi.withdraw(vacancyId, user.id);
      showToast({ text: t('vac.withdrawn') });
    },
    [user, showToast, t],
  );

  const value: WorkerState = {
    profile, profileError, reloadProfile, setAvailable, availabilityBusy, base, radiusKm,
    nearby, nearbyLoading: nearbyQ.loading, nearbyError: nearbyQ.error, reloadNearby: nearbyQ.reload,
    apply, withdraw, alert, dismissAlert: () => setAlert(null), stats: statsQ.data, extra: extraQ.data, errorText,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorker(): WorkerState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorker fuera de WorkerProvider');
  return ctx;
}
