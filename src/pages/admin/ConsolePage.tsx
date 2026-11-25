import { useTranslation } from 'react-i18next';
import { ErrorBox, Loading, Notice } from '../../components/ui';
import { formatInstant } from '../../lib/format';
import { useAsync, useInterval } from '../../lib/useAsync';
import { api } from '../../api/endpoints';
import { useApp } from '../../state/AppContext';

const GRAFANA_URL = import.meta.env.VITE_GRAFANA_URL ?? 'http://localhost:3000';

/** Consola de la región: tablero, salud de cada servicio (señala el caído) y colas de RabbitMQ. */
export function ConsolePage() {
  const { t } = useTranslation();
  const { locale, profile } = useApp();
  const c = useAsync(() => api.console(), []);
  useInterval(() => void c.reload(), 10_000);
  const d = c.data?.dashboard;

  return (
    <div className="stack">
      <div className="title-row">
        <h1>{t('admin.console', { region: d?.region ?? '' })}</h1>
        <a className="btn small" href={GRAFANA_URL} target="_blank" rel="noreferrer">{t('admin.grafana')} ↗</a>
      </div>
      {c.loading && !c.data && <Loading />}
      <ErrorBox error={c.error} />
      {c.data && (
        <>
          {c.data.down.length > 0 ? (
            <Notice tone="warn">{t('admin.down', { services: c.data.down.join(', ') })}</Notice>
          ) : (
            <Notice tone="ok">{t('admin.allUp')}</Notice>
          )}
          <section className="stat-row card">
            <div className="stat"><span className="muted small">{t('admin.today.created')}</span><strong>{d!.today.created}</strong></div>
            <div className="stat"><span className="muted small">{t('admin.today.completed')}</span><strong>{d!.today.completed}</strong></div>
            <div className="stat"><span className="muted small">{t('admin.today.cancelled')}</span><strong>{d!.today.cancelled}</strong></div>
            <div className="stat"><span className="muted small">{t('admin.workersAvailable')}</span><strong>{d!.workersAvailable}</strong></div>
          </section>

          <div className="grid-2 top">
            <section className="card">
              <h2>{t('admin.byStatus')}</h2>
              <table className="table">
                <tbody>
                  {Object.entries(d!.requestsByStatus).map(([s, n]) => (
                    <tr key={s}><th scope="row">{t(`status.${s}`)}</th><td className="num">{n}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h2>{t('admin.services')}</h2>
              <table className="table">
                <thead><tr><th>{t('admin.service')}</th><th>{t('admin.state')}</th><th className="num">ms</th></tr></thead>
                <tbody>
                  {c.data.services.map((s) => (
                    <tr key={s.name} className={s.status === 'UP' ? '' : 'row-bad'}>
                      <th scope="row">{s.name}</th>
                      <td><span className={s.status === 'UP' ? 'badge badge-ok' : 'badge badge-bad'}>{s.status}</span></td>
                      <td className="num">{s.latencyMs ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="card">
            <h2>{t('admin.queues')}</h2>
            {!c.data.queues.available ? (
              <Notice tone="warn">{t('admin.queuesUnavailable')}</Notice>
            ) : (
              <>
                <p className="small">{t('admin.deadLetters', { count: c.data.queues.deadLetters })}</p>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>{t('admin.queue')}</th><th className="num">{t('admin.ready')}</th><th className="num">{t('admin.unacked')}</th><th className="num">{t('admin.consumers')}</th></tr>
                    </thead>
                    <tbody>
                      {c.data.queues.queues.map((q) => (
                        <tr key={q.name} className={q.noConsumer ? 'row-bad' : ''}>
                          <th scope="row">{q.name}</th>
                          <td className="num">{q.ready}</td>
                          <td className="num">{q.unacked}</td>
                          <td className="num">{q.consumers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
          <p className="muted small">{t('admin.generatedAt', { at: formatInstant(d!.generatedAt, locale, d!.timezone, profile?.hourCycle) })}</p>
        </>
      )}
    </div>
  );
}
