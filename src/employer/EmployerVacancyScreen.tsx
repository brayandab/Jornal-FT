import { CalendarDays, ChevronLeft, CircleCheck, Clock, MapPin, Phone, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, CompatibilityRing, ErrorState, IconButton, InfoTile, Skeleton } from '../design/components';
import { formatRating, initials } from '../design/format';
import { useFormat } from '../design/useFormat';
import { useShell } from '../shell/ShellContext';
import { useVacancyQuery, vacancyErrorCode } from '../vacancies/hooks';
import { canFinalize, employerCost, endsAt, lastDay } from '../vacancies/logic';
import { vacancyApi } from '../vacancies/mockStore';
import type { Application, Vacancy } from '../vacancies/types';
import { VacancyStatus } from '../vacancies/VacancyCard';

const CANCEL_REASONS = ['noShow', 'notFinished', 'other'] as const;

/**
 * Vacante vista por quien la publicó:
 *  - abierta: postulados ordenados por viabilidad y selección (hasta las personas que se necesitan);
 *  - en proceso: personas seleccionadas, cancelar proceso o finalizar (se activa al terminar la última jornada);
 *  - finalizada o cancelada: resumen de pagos o motivo.
 */
export function EmployerVacancyScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useShell();
  const f = useFormat();
  const q = useVacancyQuery(() => vacancyApi.get(id), [id]);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState<(typeof CANCEL_REASONS)[number]>('noShow');
  const [otherReason, setOtherReason] = useState('');

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (q.loading && !q.data) return <div className="tw-detail"><Skeleton height={60} /><Skeleton height={140} /><Skeleton height={220} /></div>;
  if (!q.data) return <div className="tw-detail"><ErrorState message={t('vac.errors.VACANCY_NOT_FOUND')} retryLabel={t('common.back')} onRetry={back} /></div>;

  const v = q.data;
  const applicants = v.applications.filter((a) => a.status !== 'WITHDRAWN').sort((a, b) => b.viability - a.viability);
  const selected = v.applications.filter((a) => a.status === 'SELECTED');
  const money = (m: number) => f.money(m, v.currency, v.moneyScale);
  const cost = employerCost(v, v.status === 'OPEN' ? Math.max(picked.length, 1) : selected.length);
  const finalizable = canFinalize(v);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      showToast({ text: done });
    } catch (e) {
      setError(t(`vac.errors.${vacancyErrorCode(e)}`, { defaultValue: t('errors.generic') }));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (workerId: string) =>
    setPicked((p) => (p.includes(workerId) ? p.filter((x) => x !== workerId) : p.length < v.workersNeeded ? [...p, workerId] : p));

  const cancelText = reason === 'other' ? otherReason.trim() : t(`vac.cancelReasons.${reason}`);

  return (
    <div>
      <div className="tw-detail">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <IconButton label={t('common.back')} onClick={back}><ChevronLeft size={20} aria-hidden="true" /></IconButton>
          <VacancyStatus v={v} />
        </div>
        <h1 style={{ margin: 0 }}>{v.title}</h1>

        <div className="tw-tiles">
          <InfoTile icon={<CalendarDays size={16} aria-hidden="true" />} label={t('vac.dates')} value={f.dates(v)} />
          <InfoTile icon={<Clock size={16} aria-hidden="true" />} label={t('tw.schedule')} value={f.hours(v)} />
          <InfoTile icon={<Users size={16} aria-hidden="true" />} label={t('vac.people')} value={t('vac.peopleNeeded', { count: v.workersNeeded })} />
          <InfoTile icon={<MapPin size={16} aria-hidden="true" />} label={t('order.where')} value={v.addressText || '—'} />
        </div>

        {v.status === 'OPEN' && (
          <section>
            <div className="tw-section-head" style={{ marginTop: 4 }}>
              <h2>{t('vac.applicants', { count: applicants.length })}</h2>
              <span>{t('vac.byViability')}</span>
            </div>
            <p className="tw-note">{t('vac.selectUpTo', { count: v.workersNeeded })}</p>
            {applicants.length === 0 ? (
              <div className="tw-card tw-empty"><strong>{t('vac.noApplicants')}</strong><span>{t('vac.noApplicantsHint')}</span></div>
            ) : (
              <div className="tw-card" style={{ marginTop: 10 }}>
                {applicants.map((a) => (
                  <ApplicantRow key={a.id} a={a} v={v} checked={picked.includes(a.worker.workerId)}
                    disabled={!picked.includes(a.worker.workerId) && picked.length >= v.workersNeeded}
                    onToggle={() => toggle(a.worker.workerId)} />
                ))}
              </div>
            )}
          </section>
        )}

        {v.status !== 'OPEN' && selected.length > 0 && (
          <section>
            <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.selectedPeople')}</h2>
            <div className="tw-card">
              {selected.map((a) => {
                const p = v.payouts?.find((x) => x.workerId === a.worker.workerId);
                return (
                  <div key={a.id} className="tw-person">
                    <span className="tw-avatar" aria-hidden="true">{initials(a.worker.name)}</span>
                    <div>
                      <strong>{a.worker.name}</strong> {a.worker.simulated && <span className="tw-demo">{t('vac.demo')}</span>}
                      <div className="tw-meta">
                        {p ? `${money(p.amountMinor)} · ${t(`payment.${p.method.toLowerCase()}`, { defaultValue: p.method })}`
                          : a.worker.phone ? <><Phone size={14} aria-hidden="true" /> {a.worker.phone}</> : f.km(a.distanceKm)}
                      </div>
                    </div>
                    {p && <CircleCheck size={22} color="var(--color-success)" aria-label={t('vac.status.PAID')} />}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {v.status === 'IN_PROCESS' && (
          <p className={finalizable ? 'tw-banner ok' : 'tw-banner info'} role="status">
            {finalizable
              ? t('vac.readyToFinalize')
              : t('vac.finalizeFrom', { date: f.dayAbs(lastDay(v)), time: f.hour(v.endTime) })}
          </p>
        )}
        {v.status === 'CANCELLED' && <p className="tw-banner warn">{t('vac.cancelledBecause', { reason: v.cancelReason ?? '' })}</p>}

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{v.status === 'COMPLETED' ? t('vac.paidSummary') : t('vac.costSummary')}</h2>
          <div className="tw-card tw-pay">
            <div className="tw-sum-row"><span>{t('vac.sum.workers', { workers: v.status === 'OPEN' ? Math.max(picked.length, 1) : selected.length, days: v.days, pay: money(v.payPerDayMinor) })}</span><b>{money(cost.toWorkers)}</b></div>
            <div className="tw-sum-row"><span>{t('vac.sum.commission', { brand: t('app.name') })}</span><b>{money(cost.commission)}</b></div>
            <div className="tw-sum-row total"><span>{t('vac.sum.total')}</span><b>{money(cost.total)}</b></div>
          </div>
        </section>

        {v.description && (
          <section>
            <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('tw.description')}</h2>
            <p className="tw-paragraph">{v.description}</p>
          </section>
        )}

        {cancelling && (v.status === 'OPEN' || v.status === 'IN_PROCESS') && (
          <section className="tw-card" aria-labelledby="cancel-title">
            <h2 id="cancel-title" className="tw-section-title" style={{ marginTop: 0 }}>
              {v.status === 'OPEN' ? t('vac.cancelVacancy') : t('vac.cancelProcess')}
            </h2>
            <div className="tw-filters" role="radiogroup">
              {CANCEL_REASONS.map((r) => (
                <label key={r} style={{ justifyContent: 'flex-start' }}>
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)}
                    style={{ width: 20, minHeight: 0, accentColor: 'var(--color-primary)' }} />
                  {t(`vac.cancelReasons.${r}`)}
                </label>
              ))}
            </div>
            {reason === 'other' && (
              <input aria-label={t('vac.cancelReasons.other')} value={otherReason} maxLength={200} onChange={(e) => setOtherReason(e.target.value)} />
            )}
            <p className="tw-note" style={{ marginTop: 8 }}>{t('vac.cancelHint')}</p>
            <div className="tw-two" style={{ marginTop: 12 }}>
              <Button variant="secondary" disabled={busy} onClick={() => setCancelling(false)}>{t('common.back')}</Button>
              <Button data-testid="confirm-cancel" loading={busy} disabled={!cancelText}
                onClick={() => void run(() => vacancyApi.cancel(v.id, cancelText), t('vac.cancelledToast')).then(() => setCancelling(false))}>
                {t('tracking.cancelConfirm')}
              </Button>
            </div>
          </section>
        )}

        {import.meta.env.DEV && v.status === 'IN_PROCESS' && !finalizable && (
          <button type="button" className="link-btn" style={{ alignSelf: 'center' }} data-testid="demo-end"
            onClick={() => void vacancyApi.demoEnd(v.id)}>
            {t('vac.demoEnd', { at: f.instant(endsAt(v).toISOString()) })}
          </button>
        )}
        {error && <p className="tw-inline-error" role="alert">{error}</p>}
      </div>

      {v.status === 'OPEN' && !cancelling && (
        <div className="tw-actionbar">
          <Button variant="secondary" disabled={busy} onClick={() => setCancelling(true)}>{t('vac.cancel')}</Button>
          <Button data-testid="select" loading={busy} disabled={picked.length === 0}
            onClick={() => void run(() => vacancyApi.select(v.id, picked), t('vac.selectedToast', { count: picked.length }))}>
            {t('vac.selectCount', { count: picked.length })}
          </Button>
        </div>
      )}
      {v.status === 'IN_PROCESS' && !cancelling && (
        <div className="tw-actionbar">
          <Button variant="secondary" data-testid="cancel-process" disabled={busy} onClick={() => setCancelling(true)}>{t('vac.cancelProcess')}</Button>
          <Button data-testid="finalize" disabled={!finalizable} onClick={() => navigate(`/vacantes/${v.id}/finalizar`)}>
            {t('vac.finalizeProcess')}
          </Button>
        </div>
      )}
    </div>
  );
}

function ApplicantRow({ a, v, checked, disabled, onToggle }: {
  a: Application; v: Vacancy; checked: boolean; disabled: boolean; onToggle: () => void;
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
        <strong>{a.worker.name} {a.worker.simulated && <span className="tw-demo">{t('vac.demo')}</span>}</strong>
        <span className="tw-company">
          {a.worker.ratingCount > 0 && <><Star size={14} className="star" fill="currentColor" aria-hidden="true" /><b>{formatRating(a.worker.ratingAvg)}</b>&nbsp;·&nbsp;</>}
          {t('vac.jobsDone', { count: a.worker.completedJobs })} · {f.km(a.distanceKm)}
          {a.worker.categoryIds.includes(v.categoryId) && <> · {t('vac.sameCategory')}</>}
        </span>
        {(a.worker.experience || a.worker.bio) && <p>{a.worker.experience || a.worker.bio}</p>}
        {a.worker.skills.length > 0 && <p>{a.worker.skills.join(' · ')}</p>}
      </label>
      <CompatibilityRing value={a.viability} size={48} label={t('vac.viability', { value: a.viability })} />
    </div>
  );
}
