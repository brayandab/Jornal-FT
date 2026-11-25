import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, Skeleton } from '../design/components';
import { useApp } from '../state/AppContext';
import { useVacancyQuery } from '../vacancies/hooks';
import { vacancyApi } from '../vacancies/mockStore';
import type { VacancyStatus } from '../vacancies/types';
import { EmployerVacancyCard } from '../vacancies/VacancyCard';

const TABS: VacancyStatus[] = ['IN_PROCESS', 'COMPLETED', 'CANCELLED'];

/** Registro de los procesos que la empresa aprobó: en proceso, finalizados (pagados) y cancelados. */
export function RegistryScreen() {
  const { t } = useTranslation();
  const { user } = useApp();
  const [tab, setTab] = useState<VacancyStatus>('IN_PROCESS');
  const q = useVacancyQuery(() => (user ? vacancyApi.mine(user.id) : Promise.resolve([])), [user?.id]);
  const items = (q.data ?? []).filter((v) => v.status === tab);

  return (
    <div>
      <div className="tw-page-head"><h1>{t('vac.registry')}</h1></div>
      <div className="tw-segments" role="group" aria-label={t('vac.registry')}>
        {TABS.map((s) => (
          <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)}>{t(`vac.status.${s}`)}</button>
        ))}
      </div>
      {q.loading && !q.data ? (
        <div className="tw-offers"><Skeleton height={170} /><Skeleton height={170} /></div>
      ) : q.error ? (
        <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={q.reload} />
      ) : items.length === 0 ? (
        <div className="tw-card tw-empty"><strong>{t(`vac.emptyRegistry.${tab}`)}</strong></div>
      ) : (
        <ul className="tw-offers">{items.map((v) => <EmployerVacancyCard key={v.id} v={v} />)}</ul>
      )}
    </div>
  );
}
