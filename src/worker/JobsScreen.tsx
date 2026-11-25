import { CheckCircle2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton, StatCard } from '../design/components';
import { useFormat } from '../design/useFormat';
import { vacancyApi } from '../vacancies/api';
import { useVacancyQuery } from '../vacancies/hooks';
import type { Application, ApplicationStatus } from '../vacancies/types';
import { WorkerVacancyCard } from '../vacancies/VacancyCard';
import { useWorker } from './WorkerContext';

type Tab = 'active' | 'history';
const ACTIVE: ApplicationStatus[] = ['APPLIED', 'SELECTED', 'CONFIRMED'];

/** Mis trabajos: postulaciones activas (postulado, contratado o confirmado) e historial con lo ganado. */
export function JobsScreen() {
  const { t } = useTranslation();
  const w = useWorker();
  const f = useFormat();
  const [tab, setTab] = useState<Tab>('active');
  const items = w.applications.filter((a) => ACTIVE.includes(a.status) === (tab === 'active'));
  // Las vacantes de las postulaciones (para mostrar fechas, lugar y pago con la misma tarjeta).
  const ids = items.map((a) => a.vacancyId).join(',');
  const q = useVacancyQuery(() => Promise.all(items.map((a) => vacancyApi.get(a.vacancyId).catch(() => null))), [ids]);

  return (
    <div>
      <div className="tw-page-head"><h1>{t('vac.myJobs')}</h1></div>
      <div className="tw-stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <StatCard icon={<Wallet size={20} aria-hidden="true" />} value={f.money(w.stats.earnedMinor)} label={t('vac.earnedTotal')} />
        <StatCard icon={<CheckCircle2 size={20} aria-hidden="true" />} value={String(w.stats.completed)} label={t('tw.completed')} />
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
          {items.map((a: Application) => {
            const v = q.data?.find((x) => x?.id === a.vacancyId);
            if (!v) return null;
            const n = w.toNearby(v);
            return <WorkerVacancyCard key={a.id} v={v} application={a.status} distanceKm={n.distanceKm} match={n.match} />;
          })}
        </ul>
      )}
    </div>
  );
}
