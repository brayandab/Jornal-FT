import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { RequestStatus } from '../api/types';
import { ErrorBox, Loading, Select, StatusBadge } from '../components/ui';
import { formatLocal } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useApp, useMoney } from '../state/AppContext';

export const STATUSES: RequestStatus[] = [
  'PENDING_PAYMENT', 'SEARCHING_WORKER', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'PENDING_CONFIRMATION',
  'COMPLETED', 'CANCELLED', 'FAILED', 'EXPIRED',
];

/** Historial: el cliente ve los que pidió; el trabajador, los que le asignaron (con sus ganancias). */
export function RequestsPage() {
  const { t } = useTranslation();
  const { role, locale, profile } = useApp();
  const money = useMoney();
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [page, setPage] = useState(0);
  const list = useAsync(() => api.myRequests(status || undefined, page, 20), [status, page, locale]);
  const isWorker = role === 'WORKER';

  // Ganancias del trabajador en esta página: total sin propina menos la comisión de la plataforma, más la propina.
  const completed = list.data?.items.filter((r) => r.status === 'COMPLETED') ?? [];
  const earnings = completed.reduce((sum, r) => {
    const base = r.totalMinor - r.tipMinor;
    return sum + base - Math.round((base * (profile?.commissionBps ?? 0)) / 10_000) + r.tipMinor;
  }, 0);

  return (
    <div className="stack">
      <h1>{isWorker ? t('requests.jobsTitle') : t('requests.title')}</h1>
      {isWorker && completed.length > 0 && (
        <section className="card stat-row">
          <div className="stat">
            <span className="muted small">{t('requests.completedJobs')}</span>
            <strong>{completed.length}</strong>
          </div>
          <div className="stat">
            <span className="muted small">{t('requests.earnings')}</span>
            <strong>{money(earnings)}</strong>
          </div>
        </section>
      )}
      <Select label={t('requests.filter')} value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as RequestStatus | ''); }}>
        <option value="">{t('requests.all')}</option>
        {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
      </Select>
      {list.loading && <Loading />}
      <ErrorBox error={list.error} />
      <ul className="list">
        {list.data?.items.map((r) => (
          <li key={r.id}>
            <Link to={`/requests/${r.id}`} className="list-row link-row">
              <div>
                <strong>{r.categoryName}</strong>
                <div className="muted small">
                  {formatLocal(r.scheduledLocal, locale, profile?.hourCycle)} · {r.addressText}
                </div>
              </div>
              <div className="right">
                <StatusBadge status={r.status} />
                <div className="small">{money(r.totalMinor, r.currency, r.moneyScale)}</div>
              </div>
            </Link>
          </li>
        ))}
        {list.data?.items.length === 0 && <li className="muted">{t('requests.none')}</li>}
      </ul>
      {list.data && list.data.totalPages > 1 && (
        <div className="pager">
          <button className="btn small" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</button>
          <span>{t('common.page', { page: page + 1, total: list.data.totalPages })}</span>
          <button className="btn small" disabled={page + 1 >= list.data.totalPages} onClick={() => setPage(page + 1)}>{t('common.next')}</button>
        </div>
      )}
    </div>
  );
}
