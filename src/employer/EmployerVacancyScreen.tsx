import { CalendarDays, ChevronLeft, CircleCheck, Clock, MapPin, ShieldCheck, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, CompatibilityRing, ErrorState, IconButton, InfoTile, Skeleton } from '../design/components';
import { formatRating, initials } from '../design/format';
import { useFormat } from '../design/useFormat';
import { useShell } from '../shell/ShellContext';
import { vacancyApi } from '../vacancies/api';
import { friendlyError } from '../api/errors';
import { useVacancyQuery } from '../vacancies/hooks';
import { hasEnded, hasStarted } from '../vacancies/logic';
import type { Application, CloseReason, Vacancy } from '../vacancies/types';
import { TranslatedNote } from '../vacancies/TranslatedNote';
import { VacancyStatus } from '../vacancies/VacancyCard';
import { PaymentForm } from './PaymentForm';

const CLOSE_REASONS: CloseReason[] = ['NO_SHOW', 'ABANDONED', 'OTHER'];
const HIRED = ['SELECTED', 'CONFIRMED', 'DECLINED', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'];

/**
 * Vacante vista por quien la publicó:
 *  - antes de empezar: postulados ordenados por viabilidad, contratar a varios (hasta los cupos) y ver quién
 *    confirmó asistencia;
 *  - después de la hora de fin: a cada persona comprometida, «Finalizar» (pasa al pago) o «Cancelar» con
 *    motivo y justificación (sin pago); y el pago de cada uno (automático o a mano).
 */
export function EmployerVacancyScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useShell();
  const f = useFormat();
  const q = useVacancyQuery(() => Promise.all([vacancyApi.get(id), vacancyApi.applications(id)]), [id]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (q.loading && !q.data) return <div className="tw-detail"><Skeleton height={60} /><Skeleton height={140} /><Skeleton height={220} /></div>;
  if (!q.data) return <div className="tw-detail"><ErrorState message={t('vac.errors.VACANCY_NOT_FOUND')} retryLabel={t('common.back')} onRetry={back} /></div>;

  const [v, apps] = q.data;
  const started = hasStarted(v);
  const ended = hasEnded(v);
  const applicants = apps.filter((a) => a.status === 'APPLIED');
  const hired = apps.filter((a) => HIRED.includes(a.status));
  const free = Math.max(0, v.workersNeeded - v.filled);
  const canHire = !started && (v.status === 'OPEN' || v.status === 'FILLED') && free > 0;
  const money = (m: number) => f.money(m, v.currency, v.moneyScale);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      showToast({ text: done });
      return true;
    } catch (e) {
      setError(friendlyError(e, t));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const toggle = (appId: string) =>
    setPicked((p) => (p.includes(appId) ? p.filter((x) => x !== appId) : p.length < free ? [...p, appId] : p));

  return (
    <div>
      <div className="tw-detail">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <IconButton label={t('common.back')} onClick={back}><ChevronLeft size={20} aria-hidden="true" /></IconButton>
          <VacancyStatus v={v} />
        </div>
        <h1 style={{ margin: 0 }}>{v.title}</h1>
        <TranslatedNote v={v} />

        <div className="tw-tiles">
          <InfoTile icon={<CalendarDays size={16} aria-hidden="true" />} label={t('vac.dates')} value={f.dates(v)} />
          <InfoTile icon={<Clock size={16} aria-hidden="true" />} label={t('tw.schedule')} value={f.hours(v)} />
          <InfoTile icon={<Users size={16} aria-hidden="true" />} label={t('vac.people')} value={t('vac.hiredOf', { count: v.filled, needed: v.workersNeeded })} />
          <InfoTile icon={<MapPin size={16} aria-hidden="true" />} label={t('order.where')} value={v.addressText || '—'} />
        </div>

        {ended && hired.some((a) => a.status === 'SELECTED' || a.status === 'CONFIRMED') && (
          <p className="tw-banner ok" role="status">{t('vac.readyToClose')}</p>
        )}
        {!ended && started && <p className="tw-banner info" role="status">{t('vac.closeFrom', { at: f.instant(v.endsAt) })}</p>}
        {v.status === 'CANCELLED' && <p className="tw-banner warn">{t('vac.vacancyCancelled')}</p>}

        {hired.length > 0 && (
          <section>
            <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.hiredPeople')}</h2>
            <div className="tw-card">
              {hired.map((a) => (
                <HiredRow key={a.id} a={a} v={v} ended={ended} money={money} />
              ))}
            </div>
          </section>
        )}

        {!started && v.status !== 'CANCELLED' && (
          <section>
            <div className="tw-section-head" style={{ marginTop: 4 }}>
              <h2>{t('vac.applicants', { count: applicants.length })}</h2>
              <span>{t('vac.byViability')}</span>
            </div>
            {canHire && <p className="tw-note">{t('vac.selectUpTo', { count: free })}</p>}
            {applicants.length === 0 ? (
              <div className="tw-card tw-empty"><strong>{t('vac.noApplicants')}</strong><span>{t('vac.noApplicantsHint')}</span></div>
            ) : (
              <div className="tw-card" style={{ marginTop: 10 }}>
                {applicants.map((a) => (
                  <ApplicantRow key={a.id} a={a} checked={picked.includes(a.id)}
                    disabled={!canHire || (!picked.includes(a.id) && picked.length >= free)} onToggle={() => toggle(a.id)} />
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.costSummary')}</h2>
          <div className="tw-card tw-pay">
            <div className="tw-sum-row"><span>{t('vac.sum.perPerson', { count: v.days, pay: money(v.payPerDayMinor) })}</span><b>{money(v.payMinor)}</b></div>
            <div className="tw-sum-row total"><span>{t('vac.sum.forPeople', { count: v.workersNeeded })}</span><b>{money(v.payMinor * v.workersNeeded)}</b></div>
          </div>
        </section>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.whatToDo')}</h2>
          <p className="tw-paragraph">{v.description}</p>
          {v.requirements.length > 0 && (
            <ul className="tw-reqs">
              {v.requirements.map((r) => <li key={r}><CircleCheck size={20} aria-hidden="true" />{r}</li>)}
            </ul>
          )}
        </section>

        {confirmCancel && (
          <section className="tw-card" aria-labelledby="cancel-title">
            <h2 id="cancel-title" className="tw-section-title" style={{ marginTop: 0 }}>{t('vac.cancelVacancy')}</h2>
            <p className="tw-note">{t('vac.cancelHint')}</p>
            <div className="tw-two" style={{ marginTop: 12 }}>
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmCancel(false)}>{t('common.back')}</Button>
              <Button data-testid="confirm-cancel" loading={busy}
                onClick={() => void run(() => vacancyApi.cancelVacancy(v.id), t('vac.cancelledToast')).then(() => setConfirmCancel(false))}>
                {t('tracking.cancelConfirm')}
              </Button>
            </div>
          </section>
        )}
        {error && <p className="tw-inline-error" role="alert">{error}</p>}
      </div>

      {!started && (v.status === 'OPEN' || v.status === 'FILLED') && !confirmCancel && (
        <div className="tw-actionbar">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmCancel(true)}>{t('vac.cancel')}</Button>
          <Button data-testid="select" loading={busy} disabled={picked.length === 0}
            onClick={() => void run(() => vacancyApi.select(v.id, picked), t('vac.selectedToast', { count: picked.length }))
              .then((ok) => ok && setPicked([]))}>
            {t('vac.selectCount', { count: picked.length })}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Postulado: viabilidad, calificación, trabajos finalizados y distancia; casilla para contratarlo. */
function ApplicantRow({ a, checked, disabled, onToggle }: {
  a: Application; checked: boolean; disabled: boolean; onToggle: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const inputId = `pick-${a.id}`;
  return (
    <div className="tw-applicant" data-testid="applicant">
      <span className="tw-check">
        <input id={inputId} type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} />
      </span>
      <label htmlFor={inputId} className="who" style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <strong>{a.worker.name} {a.worker.verified && <ShieldCheck size={14} aria-label={t('vac.verified')} />}</strong>
        <span className="tw-company">
          {a.worker.ratingCount > 0 && <><Star size={14} className="star" fill="currentColor" aria-hidden="true" /><b>{formatRating(a.worker.ratingAvg)}</b>&nbsp;·&nbsp;</>}
          {t('vac.jobsDone', { count: a.worker.completedJobs })}
          {a.distanceKm != null && <> · {f.km(a.distanceKm)}</>}
        </span>
        {a.message && <p>{a.message}</p>}
      </label>
      <CompatibilityRing value={a.viability} size={48} label={t('vac.viability', { value: a.viability })} />
    </div>
  );
}

/**
 * Persona contratada: estado de su asistencia; tras la hora de fin, botones «Finalizar» y «Cancelar»;
 * y, finalizada, el estado de su pago (automático o a mano, con justificación si se paga menos).
 */
function HiredRow({ a, v, ended, money }: { a: Application; v: Vacancy; ended: boolean; money: (m: number) => string }) {
  const { t } = useTranslation();
  const { showToast } = useShell();
  const [mode, setMode] = useState<'none' | 'cancel' | 'pay'>('none');
  const [reason, setReason] = useState<CloseReason>('NO_SHOW');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closable = ended && (a.status === 'SELECTED' || a.status === 'CONFIRMED');
  const payable = a.status === 'COMPLETED' && (a.payoutStatus === 'PENDING' || a.payoutStatus === 'FAILED');

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      showToast({ text: done });
      setMode('none');
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  let detail: string = t(`vac.hiredStatus.${a.status}`);
  if (a.status === 'COMPLETED' && a.payoutStatus) {
    detail = t(`vac.payout.${a.payoutStatus}`, { amount: money(a.paidAmountMinor ?? a.payoutMinor ?? 0) });
  }
  if (a.status === 'CANCELLED') detail = `${t(`vac.closeReason.${a.closeReason ?? 'OTHER'}`)}: ${a.justification ?? ''}`;

  return (
    <div className="tw-person" data-testid="hired" style={{ flexWrap: 'wrap' }}>
      <span className="tw-avatar" aria-hidden="true">{initials(a.worker.name)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>{a.worker.name}</strong>
        <div className="tw-meta">{detail}</div>
        {a.paymentNote && <div className="tw-note">{t('vac.paymentNote', { note: a.paymentNote })}</div>}
      </div>
      {a.status === 'COMPLETED' && a.payoutStatus === 'PAID' && <CircleCheck size={22} color="var(--color-success)" aria-hidden="true" />}

      {closable && mode === 'none' && (
        <div className="tw-two" style={{ width: '100%', marginTop: 8 }}>
          <Button variant="secondary" disabled={busy} data-testid="cancel-work" onClick={() => setMode('cancel')}>{t('vac.cancelWork')}</Button>
          <Button loading={busy} data-testid="complete-work"
            onClick={() => void run(() => vacancyApi.complete(v.id, a.id), t('vac.completedToast', { name: a.worker.name }))}>
            {t('vac.completeWork')}
          </Button>
        </div>
      )}

      {closable && mode === 'cancel' && (
        <div style={{ width: '100%', marginTop: 8 }}>
          <div className="tw-filters" role="radiogroup" aria-label={t('vac.cancelWork')}>
            {CLOSE_REASONS.map((r) => (
              <label key={r} style={{ justifyContent: 'flex-start' }}>
                <input type="radio" name={`reason-${a.id}`} checked={reason === r} onChange={() => setReason(r)}
                  style={{ width: 20, minHeight: 0, accentColor: 'var(--color-primary)' }} />
                {t(`vac.closeReason.${r}`)}
              </label>
            ))}
          </div>
          <div className="field">
            <label htmlFor={`just-${a.id}`}>{t('vac.justification')} *</label>
            <textarea id={`just-${a.id}`} maxLength={1000} value={justification} onChange={(e) => setJustification(e.target.value)} />
          </div>
          <p className="tw-note">{t('vac.cancelWorkHint')}</p>
          <div className="tw-two" style={{ marginTop: 8 }}>
            <Button variant="secondary" disabled={busy} onClick={() => setMode('none')}>{t('common.back')}</Button>
            <Button loading={busy} disabled={!justification.trim()} data-testid="confirm-cancel-work"
              onClick={() => void run(() => vacancyApi.cancelWork(v.id, a.id, reason, justification.trim()), t('vac.cancelledWorkToast'))}>
              {t('vac.cancelWork')}
            </Button>
          </div>
        </div>
      )}

      {payable && mode === 'none' && (
        <Button style={{ width: '100%', marginTop: 8 }} data-testid="pay-manual" onClick={() => setMode('pay')}>{t('vac.registerPayment')}</Button>
      )}
      {payable && mode === 'pay' && (
        <PaymentForm application={a} onDone={() => setMode('none')} onCancel={() => setMode('none')} />
      )}
      {error && <p className="tw-inline-error" role="alert" style={{ width: '100%' }}>{error}</p>}
    </div>
  );
}
