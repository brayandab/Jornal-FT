import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, IconButton, Skeleton } from '../design/components';
import { initials } from '../design/format';
import { useFormat } from '../design/useFormat';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { useVacancyQuery, vacancyErrorCode } from '../vacancies/hooks';
import { canFinalize, employerCost, workerTotal } from '../vacancies/logic';
import { vacancyApi } from '../vacancies/mockStore';

/**
 * Finalizar proceso: la empresa elige con qué método le paga a cada trabajador (los del país, del perfil
 * regional) y paga el total más la comisión de la app. Solo se puede al terminar la última jornada.
 */
export function FinalizeScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { profile } = useApp();
  const { showToast } = useShell();
  const f = useFormat();
  const q = useVacancyQuery(() => vacancyApi.get(id), [id]);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = profile?.paymentMethods ?? [];

  const selected = (q.data?.applications ?? []).filter((a) => a.status === 'SELECTED');
  useEffect(() => {
    if (!options[0]) return;
    setMethods((m) => Object.fromEntries(selected.map((a) => [a.worker.workerId, m[a.worker.workerId] ?? options[0].code])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, profile]);

  if (q.loading && !q.data) return <div className="tw-detail"><Skeleton height={60} /><Skeleton height={220} /></div>;
  const v = q.data;
  if (!v) return <div className="tw-detail"><ErrorState message={t('vac.errors.VACANCY_NOT_FOUND')} retryLabel={t('common.back')} onRetry={() => navigate('/')} /></div>;
  if (!canFinalize(v)) {
    return <div className="tw-detail"><ErrorState message={t('vac.errors.VACANCY_NOT_FINISHED')} retryLabel={t('common.back')} onRetry={() => navigate(`/vacantes/${v.id}`)} /></div>;
  }

  const money = (m: number) => f.money(m, v.currency, v.moneyScale);
  const each = workerTotal(v);
  const cost = employerCost(v, selected.length);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await vacancyApi.finalize(v.id, selected.map((a) => ({
        workerId: a.worker.workerId, name: a.worker.name, method: methods[a.worker.workerId], amountMinor: each,
      })));
      showToast({ text: t('vac.finalizedToast') });
      navigate(`/vacantes/${v.id}`, { replace: true });
    } catch (e) {
      setError(t(`vac.errors.${vacancyErrorCode(e)}`, { defaultValue: t('errors.generic') }));
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="tw-detail">
        <div className="row">
          <IconButton label={t('common.back')} onClick={() => navigate(`/vacantes/${v.id}`)}><ChevronLeft size={20} aria-hidden="true" /></IconButton>
        </div>
        <h1 style={{ margin: 0 }}>{t('vac.finalizeTitle')}</h1>
        <p className="tw-note">{t('vac.finalizeHint', { title: v.title })}</p>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.payEachWorker')}</h2>
          <div className="tw-card">
            {selected.map((a) => (
              <div key={a.id} className="tw-person">
                <span className="tw-avatar" aria-hidden="true">{initials(a.worker.name)}</span>
                <div>
                  <strong>{a.worker.name}</strong>
                  <div className="tw-meta">{money(each)} · {t('vac.daysCount', { count: v.days })}</div>
                </div>
                <select aria-label={t('vac.methodFor', { name: a.worker.name })} value={methods[a.worker.workerId] ?? ''}
                  onChange={(e) => setMethods({ ...methods, [a.worker.workerId]: e.target.value })}>
                  {options.map((m) => <option key={m.code} value={m.code}>{t(m.labelKey, { defaultValue: m.code })}</option>)}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="tw-card tw-pay">
            <div className="tw-sum-row"><span>{t('vac.sum.workers', { workers: selected.length, days: v.days, pay: money(v.payPerDayMinor) })}</span><b>{money(cost.toWorkers)}</b></div>
            <div className="tw-sum-row"><span>{t('vac.sum.commission', { brand: t('app.name') })}</span><b>{money(cost.commission)}</b></div>
            <div className="tw-sum-row total"><span>{t('vac.sum.total')}</span><b>{money(cost.total)}</b></div>
          </div>
        </section>
        <p className="tw-note">{t('vac.simulatedPayment')}</p>
        {error && <p className="tw-inline-error" role="alert">{error}</p>}
      </div>
      <div className="tw-actionbar single">
        <Button data-testid="pay" loading={busy} onClick={() => void pay()}>{t('vac.payAmount', { amount: money(cost.total) })}</Button>
      </div>
    </div>
  );
}
