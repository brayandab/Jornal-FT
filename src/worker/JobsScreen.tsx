import { CheckCircle2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton, StatCard } from '../design/components';
import { useFormat } from '../design/useFormat';
import { useApp } from '../state/AppContext';
import { useVacancyQuery } from '../vacancies/hooks';
import { haversineKm, matchFor, round1 } from '../vacancies/logic';
import { vacancyApi } from '../vacancies/mockStore';
import { WorkerVacancyCard } from '../vacancies/VacancyCard';
import { useWorker } from './WorkerContext';

type Tab = 'active' | 'history';

/** Mis trabajos: postulaciones activas (postulado o seleccionado) e historial con lo ganado. */
export function JobsScreen() {
  const { t } = useTranslation();
  const { user } = useApp();
  const w = useWorker();
  const f = useFormat();
  const [tab, setTab] = useState<Tab>('active');
  const q = useVacancyQuery(() => (user ? vacancyApi.myApplications(user.id) : Promise.resolve([])), [user?.id]);

  const items = (q.data ?? []).filter(({ vacancy: v, application: a }) => {
    const active = (a.status === 'APPLIED' && v.status === 'OPEN') || (a.status === 'SELECTED' && v.status === 'IN_PROCESS');
    return tab === 'active' ? active : !active;
  });
  const categoryIds = w.profile?.categories?.map((c) => c.id) ?? [];

  return (
    <div>
      <div className="tw-page-head"><h1>{t('vac.myJobs')}</h1></div>
      <div className="tw-stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <StatCard icon={<Wallet size={20} aria-hidden="true" />} value={f.money(w.stats?.earnedMinor ?? 0)} label={t('vac.earnedTotal')} />
        <StatCard icon={<CheckCircle2 size={20} aria-hidden="true" />} value={String(w.stats?.completed ?? 0)} label={t('tw.completed')} />
      </div>
      <div className="tw-segments" role="group" aria-label={t('vac.myJobs')}>
        <button type="button" aria-pressed={tab === 'active'} onClick={() => setTab('active')}>{t('vac.tabActive')}</button>
        <button type="button" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>{t('vac.tabHistory')}</button>
      </div>
      {q.loading && !q.data ? (
        <div className="tw-offers"><Skeleton height={170} /><Skeleton height={170} /></div>
      ) : q.error ? (
        <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={q.reload} />
      ) : items.length === 0 ? (
        <div className="tw-card tw-empty">
          <strong>{tab === 'active' ? t('vac.noActive') : t('vac.noHistory')}</strong>
          {tab === 'active' && <span>{t('vac.noActiveHint')}</span>}
        </div>
      ) : (
        <ul className="tw-offers">
          {items.map(({ vacancy: v, application: a }) => {
            const d = round1(haversineKm(w.base, { lat: v.latitude, lng: v.longitude }));
            return <WorkerVacancyCard key={a.id} v={v} application={a} distanceKm={d}
              match={matchFor(d, w.radiusKm, categoryIds.includes(v.categoryId))} />;
          })}
        </ul>
      )}
    </div>
  );
}
