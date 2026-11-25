import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import type { RequestStatus } from '../../api/types';
import { ErrorBox, Loading, Select, StatusBadge } from '../../components/ui';
import { formatInstant } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useApp, useMoney } from '../../state/AppContext';
import { STATUSES } from '../RequestsPage';

/** Todos los pedidos de la región. */
export function AdminRequestsPage() {
  const { t } = useTranslation();
  const { locale, profile } = useApp();
  const money = useMoney();
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [page, setPage] = useState(0);
  const list = useAsync(() => api.adminRequests({ status: status || undefined, page, size: 20 }), [status, page, locale]);

  return (
    <div className="stack">
      <h1>{t('nav.allRequests')}</h1>
      <Select label={t('requests.filter')} value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as RequestStatus | ''); }}>
        <option value="">{t('requests.all')}</option>
        {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
      </Select>
      {list.loading && !list.data && <Loading />}
      <ErrorBox error={list.error} />
      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr><th>{t('admin.created')}</th><th>{t('admin.category')}</th><th>{t('admin.state')}</th><th className="num">{t('order.total')}</th></tr>
          </thead>
          <tbody>
            {list.data?.items.map((r) => (
              <tr key={r.id}>
                <td className="small">{formatInstant(r.createdAt, locale, r.timezone, profile?.hourCycle)}</td>
                <th scope="row"><Link to={`/requests/${r.id}`}>{r.categoryName}</Link></th>
                <td><StatusBadge status={r.status} /></td>
                <td className="num">{money(r.totalMinor, r.currency, r.moneyScale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
