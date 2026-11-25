import { BadgeCheck, Bell, Briefcase, Map as MapIcon, SlidersHorizontal, Star, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Chip, ErrorState, IconButton, Skeleton, StatCard, Switch } from '../design/components';
import { formatRating, greetingKey, initials } from '../design/format';
import { useFormat } from '../design/useFormat';
import { ZoneMap } from '../design/ZoneMap';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { WorkerVacancyCard } from '../vacancies/VacancyCard';
import { useWorker } from './WorkerContext';

/** Inicio del trabajador (sección 6.1): disponibilidad, estadísticas, mapa y vacantes cercanas recomendadas. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useApp();
  const { unread } = useShell();
  const w = useWorker();
  const f = useFormat();
  const [category, setCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [maxKm, setMaxKm] = useState<number | null>(null);
  const [onlyUrgent, setOnlyUrgent] = useState(false);

  const open = useMemo(() => w.nearby.filter((n) => !n.mine || n.mine.status === 'WITHDRAWN'), [w.nearby]);
  const categories = useMemo(() => [...new Set(open.map((n) => n.vacancy.categoryName))], [open]);
  const shown = open.filter(
    (n) =>
      (!category || n.vacancy.categoryName === category) &&
      (maxKm === null || n.distanceKm <= maxKm) &&
      (!onlyUrgent || n.vacancy.urgent),
  );
  const available = !!w.profile?.available;
  const verified = user?.verificationState === 'VERIFIED';

  return (
    <div>
      <header className="tw-header">
        <div className="tw-avatar" aria-hidden="true">
          {w.extra?.photo ? <img src={w.extra.photo} alt="" /> : initials(user?.name ?? '')}
          {verified && <span className="check"><BadgeCheck size={12} strokeWidth={2.5} /></span>}
        </div>
        <div className="tw-greeting">
          <span>{t(`tw.greeting.${greetingKey()}`)}</span>
          <strong>{user?.givenName}</strong>
        </div>
        <IconButton label={t('tw.notifications')} dot={unread > 0} onClick={() => navigate('/mensajes')}>
          <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </header>

      {!verified && <p className="tw-notice" style={{ marginBottom: 16 }}>{t('worker.notVerified')}</p>}

      {w.profile ? (
        <section className={available ? 'tw-availability' : 'tw-availability off'}>
          <span className="dot" aria-hidden="true" />
          <div>
            <strong>{available ? t('tw.available') : t('tw.unavailable')}</strong>
            <span>{available ? t('vac.receiving', { km: w.radiusKm }) : t('tw.turnOn')}</span>
          </div>
          <Switch checked={available} disabled={w.availabilityBusy} onChange={(v) => void w.setAvailable(v)} label={t('tw.available')} />
        </section>
      ) : w.profileError ? (
        <ErrorState message={t('tw.loadError')} retryLabel={t('tw.retry')} onRetry={() => void w.reloadProfile()} />
      ) : (
        <Skeleton height={78} style={{ marginBottom: 16 }} />
      )}

      {w.stats && w.profile ? (
        <div className="tw-stats">
          <StatCard icon={<TrendingUp size={20} aria-hidden="true" />} value={f.money(w.stats.weekMinor)} label={t('tw.thisWeek')} />
          <StatCard icon={<Briefcase size={20} aria-hidden="true" />} value={String(w.stats.completed)} label={t('tw.completed')} />
          <StatCard icon={<Star size={20} aria-hidden="true" />} value={formatRating(w.profile.ratingAvg)} label={t('tw.rating')} />
        </div>
      ) : (
        <div className="tw-stats"><Skeleton height={96} /><Skeleton height={96} /><Skeleton height={96} /></div>
      )}

      <div className="tw-zone-map">
        <ZoneMap me={w.base} pins={open.map((n) => ({ lat: n.vacancy.latitude, lng: n.vacancy.longitude }))} zoom={12} />
        <button type="button" className="tw-map-overlay" aria-label={t('tw.seeMap')} onClick={() => navigate('/mapa')} />
        <button type="button" className="tw-float-pill" onClick={() => navigate('/mapa')}>
          <MapIcon size={16} aria-hidden="true" /> {t('tw.seeMap')}
        </button>
      </div>

      <div className="tw-section-head">
        <h2>{t('vac.nearYou')}</h2>
        <span>{t('tw.byCompatibility')}</span>
      </div>
      <div className="tw-chips" role="toolbar" aria-label={t('tw.filters')}>
        <Chip icon={<SlidersHorizontal size={16} aria-hidden="true" />} pressed={showFilters} onClick={() => setShowFilters(!showFilters)}>
          {t('tw.filters')}
        </Chip>
        {categories.map((c) => (
          <Chip key={c} pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>{c}</Chip>
        ))}
      </div>
      {showFilters && (
        <div className="tw-card small tw-filters">
          <label>
            {t('tw.maxDistance', { km: maxKm ?? w.radiusKm })}
            <input type="range" min={1} max={w.radiusKm} value={maxKm ?? w.radiusKm} onChange={(e) => setMaxKm(Number(e.target.value))} />
          </label>
          <label>
            {t('tw.onlyUrgent')}
            <Switch checked={onlyUrgent} onChange={setOnlyUrgent} label={t('tw.onlyUrgent')} />
          </label>
        </div>
      )}

      {w.nearbyLoading ? (
        <div className="tw-offers"><Skeleton height={190} /><Skeleton height={190} /></div>
      ) : w.nearbyError ? (
        <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={w.reloadNearby} />
      ) : shown.length === 0 ? (
        <div className="tw-card tw-empty">
          {available ? (
            <><strong>{t('tw.noOffers')}</strong><span>{t('tw.weWillNotify')}</span></>
          ) : (
            <strong>{t('tw.activateToReceive')}</strong>
          )}
        </div>
      ) : (
        <ul className="tw-offers">
          {shown.map((n) => <WorkerVacancyCard key={n.vacancy.id} v={n.vacancy} distanceKm={n.distanceKm} match={n.match} />)}
        </ul>
      )}
    </div>
  );
}
