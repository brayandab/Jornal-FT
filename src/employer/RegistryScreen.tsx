import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, ErrorState, Skeleton } from '../design/components';
import { initials } from '../design/format';
import { useFormat } from '../design/useFormat';
import { vacancyApi } from '../vacancies/api';
import { useVacancyQuery } from '../vacancies/hooks';
import type { Application, PayoutStatus, Vacancy } from '../vacancies/types';
import { EmployerVacancyCard } from '../vacancies/VacancyCard';
import { PaymentForm } from './PaymentForm';

type Tab = 'TO_CLOSE' | 'PAYMENTS' | 'OPEN' | 'CLOSED' | 'CANCELLED';
const TABS: Tab[] = ['TO_CLOSE', 'PAYMENTS', 'OPEN', 'CLOSED', 'CANCELLED'];

/**
 * Registro de quien contrata:
 *  - Por cerrar: vacantes ya terminadas con personas que se comprometieron a ir (finalizar o cancelar a cada una);
 *  - Pagos: personas finalizadas y el estado de su pago (pagar a mano lo pendiente o lo que falló);
 *  - Abiertas (incluye las que ya tienen los cupos completos), cerradas y canceladas.
 */
export function RegistryScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('TO_CLOSE');

  return (
    <div>
      <div className="tw-page-head"><h1>{t('vac.registry')}</h1></div>
      <div className="tw-segments" role="group" aria-label={t('vac.registry')} style={{ overflowX: 'auto' }}>
        {TABS.map((s) => (
          <button key={s} type="button" aria-pressed={tab === s} onClick={() => setTab(s)}>{t(`vac.tab.${s}`)}</button>
        ))}
      </div>
      {tab === 'PAYMENTS' ? <Payments /> : <Vacancies tab={tab} />}
    </div>
  );
}

function Vacancies({ tab }: { tab: Exclude<Tab, 'PAYMENTS'> }) {
  const { t } = useTranslation();
  const q = useVacancyQuery(() => vacancyApi.mine(tab === 'TO_CLOSE'), [tab]);
  const keep = (v: Vacancy) =>
    tab === 'TO_CLOSE' || (tab === 'OPEN' ? v.status === 'OPEN' || v.status === 'FILLED' : v.status === tab);
  const items = (q.data ?? []).filter(keep);

  if (q.loading && !q.data) return <div className="tw-offers"><Skeleton height={170} /><Skeleton height={170} /></div>;
  if (q.error) return <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={q.reload} />;
  if (items.length === 0) return <div className="tw-card tw-empty"><strong>{t(`vac.emptyRegistry.${tab}`)}</strong></div>;
  return <ul className="tw-offers">{items.map((v) => <EmployerVacancyCard key={v.id} v={v} />)}</ul>;
}

function Payments() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PayoutStatus | undefined>();
  const q = useVacancyQuery(() => vacancyApi.payouts(status), [status]);
  const [paying, setPaying] = useState<string | null>(null);

  return (
    <>
      <div className="tw-chips" role="toolbar" aria-label={t('vac.tab.PAYMENTS')}>
        {([undefined, 'PENDING', 'PROCESSING', 'FAILED', 'PAID'] as (PayoutStatus | undefined)[]).map((s) => (
          <button key={s ?? 'ALL'} type="button" className={status === s ? 'chip-btn selected' : 'chip-btn'}
            aria-pressed={status === s} onClick={() => setStatus(s)}>
            {t(`vac.payoutFilter.${s ?? 'ALL'}`)}
          </button>
        ))}
      </div>
      {q.loading && !q.data ? (
        <div className="tw-offers"><Skeleton height={90} /><Skeleton height={90} /></div>
      ) : q.error ? (
        <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={q.reload} />
      ) : (q.data ?? []).length === 0 ? (
        <div className="tw-card tw-empty"><strong>{t('vac.emptyRegistry.PAYMENTS')}</strong></div>
      ) : (
        <div className="tw-card" style={{ marginTop: 10 }}>
          {q.data!.map((a) => (
            <PayoutRow key={a.id} a={a} paying={paying === a.id} onPay={() => setPaying(a.id)} onClose={() => setPaying(null)} />
          ))}
        </div>
      )}
    </>
  );
}

function PayoutRow({ a, paying, onPay, onClose }: { a: Application; paying: boolean; onPay: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const money = (m: number) => f.money(m, a.currency, a.moneyScale);
  const payable = a.payoutStatus === 'PENDING' || a.payoutStatus === 'FAILED';
  return (
    <div className="tw-person" data-testid="payout" style={{ flexWrap: 'wrap' }}>
      <span className="tw-avatar" aria-hidden="true">{initials(a.worker.name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{a.worker.name}</strong>
        <div className="tw-meta">
          <Link to={`/vacantes/${a.vacancyId}`}>{a.vacancyTitle}</Link>
        </div>
        <div className="tw-meta">
          {t(`vac.payout.${a.payoutStatus ?? 'PENDING'}`, { amount: money(a.paidAmountMinor ?? a.payoutMinor ?? 0) })}
          {a.payoutMode && <> · {t(`vac.payoutMode.${a.payoutMode}`)}</>}
        </div>
        {a.paidAmountMinor != null && a.payoutMinor != null && a.paidAmountMinor < a.payoutMinor && (
          <div className="tw-note">{t('vac.agreedAmount', { amount: money(a.payoutMinor) })}</div>
        )}
        {a.paymentNote && <div className="tw-note">{t('vac.paymentNote', { note: a.paymentNote })}</div>}
        {a.paidAt && <div className="tw-note">{f.instant(a.paidAt)}</div>}
      </div>
      {a.payoutStatus === 'PAID' && <CircleCheck size={22} color="var(--color-success)" aria-hidden="true" />}
      {payable && !paying && <Button variant="secondary" onClick={onPay}>{t('vac.registerPayment')}</Button>}
      {payable && paying && <PaymentForm application={a} onDone={onClose} onCancel={onClose} />}
    </div>
  );
}
