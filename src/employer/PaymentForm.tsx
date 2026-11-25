import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '../components/ui';
import { Button } from '../design/components';
import { useFormat } from '../design/useFormat';
import { fromMinor, toMinor } from '../lib/format';
import { useShell } from '../shell/ShellContext';
import { vacancyApi } from '../vacancies/api';
import { friendlyError } from '../api/errors';
import type { Application } from '../vacancies/types';

/**
 * Pago a mano: quien contrata registra cuánto le pagó a la persona. Si paga menos de lo que dice la vacante,
 * debe justificar por qué (el backend también lo exige).
 */
export function PaymentForm({ application: a, onDone, onCancel }: {
  application: Application; onDone: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { showToast } = useShell();
  const agreed = a.payoutMinor ?? 0;
  const [amount, setAmount] = useState(String(fromMinor(agreed, a.moneyScale)));
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountMinor = amount === '' ? NaN : toMinor(Number(amount), a.moneyScale);
  const less = amountMinor < agreed;
  const valid = Number.isFinite(amountMinor) && amountMinor >= 0 && (!less || justification.trim().length > 0);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      await vacancyApi.pay(a.vacancyId, a.id, amountMinor, less ? justification.trim() : undefined);
      showToast({ text: t('vac.paidToast', { name: a.worker.name }) });
      onDone();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ width: '100%', marginTop: 8 }} data-testid="payment-form">
      <Field label={t('vac.amountPaid', { currency: a.currency })} type="number" min={0}
        step={a.moneyScale ? 1 / 10 ** a.moneyScale : 1} value={amount}
        hint={t('vac.agreedAmount', { amount: f.money(agreed, a.currency, a.moneyScale) })}
        onChange={(e) => setAmount(e.target.value)} />
      {less && (
        <div className="field">
          <label htmlFor={`pay-just-${a.id}`}>{t('vac.payLessJustification')} *</label>
          <textarea id={`pay-just-${a.id}`} maxLength={1000} value={justification} onChange={(e) => setJustification(e.target.value)} />
        </div>
      )}
      {error && <p className="tw-inline-error" role="alert">{error}</p>}
      <div className="tw-two" style={{ marginTop: 8 }}>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>{t('common.back')}</Button>
        <Button loading={busy} disabled={!valid} data-testid="confirm-pay" onClick={() => void pay()}>{t('vac.confirmPayment')}</Button>
      </div>
    </div>
  );
}
