import { Building2, CalendarDays, ChevronLeft, CircleCheck, Clock, MapPin, Share2, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionBar, Badge, Button, CompatibilityRing, ErrorState, IconButton, InfoTile, Skeleton } from '../design/components';
import { useFormat } from '../design/useFormat';
import { ZoneMap } from '../design/ZoneMap';
import { useShell } from '../shell/ShellContext';
import { vacancyApi } from '../vacancies/api';
import { useVacancyQuery } from '../vacancies/hooks';
import { hasStarted } from '../vacancies/logic';
import { TranslatedNote } from '../vacancies/TranslatedNote';
import { VacancyStatus } from '../vacancies/VacancyCard';
import { useWorker } from './WorkerContext';

/**
 * Detalle de la vacante para el trabajador: lugar, implementos, día y hora, qué hay que hacer y cuánto paga.
 * Según su postulación: postularse, retirarse o el botón «¿Puedes asistir?» cuando lo contrataron.
 */
export function WorkerVacancyScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useShell();
  const w = useWorker();
  const f = useFormat();
  const q = useVacancyQuery(() => vacancyApi.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (q.loading && !q.data) {
    return (
      <div>
        <Skeleton height={230} style={{ borderRadius: 0 }} />
        <div className="tw-detail"><Skeleton height={60} /><Skeleton height={80} /><Skeleton height={140} /></div>
      </div>
    );
  }
  if (!q.data) {
    return <div className="tw-detail"><ErrorState message={t('vac.errors.VACANCY_NOT_FOUND')} retryLabel={t('common.back')} onRetry={back} /></div>;
  }

  const v = q.data;
  const { distanceKm, match } = w.toNearby(v);
  const mine = v.myApplication;
  const app = w.applications.find((a) => a.vacancyId === v.id);
  const started = hasStarted(v);
  const canApply = v.status === 'OPEN' && !started && (!mine || mine === 'WITHDRAWN');
  const canWithdraw = !started && (mine === 'APPLIED' || mine === 'SELECTED' || mine === 'CONFIRMED');
  const money = (m: number) => f.money(m, v.currency, v.moneyScale);
  const total = money(v.payMinor);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: v.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        showToast({ text: t('tw.linkCopied') });
      }
    } catch {
      // compartir cancelado
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(w.errorText(e));
    } finally {
      setBusy(false);
    }
  };

  // Mensaje según la etapa de la postulación
  const when = { date: f.dayAbs(v.startDate), time: f.hour(v.startTime), address: v.addressText };
  let banner: { tone: 'ok' | 'warn' | 'info'; text: string } | null = null;
  if (mine === 'APPLIED') banner = { tone: 'info', text: t('vac.banner.applied') };
  if (mine === 'SELECTED') banner = { tone: 'ok', text: t('vac.banner.selected', when) };
  if (mine === 'CONFIRMED') banner = { tone: 'ok', text: t('vac.banner.confirmed', when) };
  if (mine === 'DECLINED') banner = { tone: 'warn', text: t('vac.banner.declined') };
  if (mine === 'NOT_SELECTED') banner = { tone: 'warn', text: t('vac.banner.notSelected') };
  if (mine === 'CANCELLED') banner = { tone: 'warn', text: t('vac.banner.workCancelled', { reason: app?.justification ?? '' }) };
  if (mine === 'COMPLETED') {
    banner = app?.payoutStatus === 'PAID'
      ? { tone: 'ok', text: t('vac.banner.paid', { amount: money(app.paidAmountMinor ?? app.payoutMinor ?? 0) }) }
      : { tone: 'ok', text: t('vac.banner.completed') };
  }
  if (!banner && v.status === 'CANCELLED') banner = { tone: 'warn', text: t('vac.banner.cancelled') };
  if (!banner && !canApply) banner = { tone: 'warn', text: t('vac.banner.closed') };

  return (
    <div>
      <div className="tw-detail-map">
        <ZoneMap me={w.base} work={{ lat: v.latitude, lng: v.longitude }} zoom={14} cellKm={0.6} />
        <IconButton className="back" label={t('common.back')} onClick={back}><ChevronLeft size={20} aria-hidden="true" /></IconButton>
        <IconButton className="share" label={t('tw.share')} onClick={() => void share()}><Share2 size={20} aria-hidden="true" /></IconButton>
      </div>

      <div className="tw-detail">
        {banner && <p className={`tw-banner ${banner.tone}`} role="status">{banner.text}</p>}
        {app?.paymentNote && mine === 'COMPLETED' && <p className="tw-note">{t('vac.employerNote', { note: app.paymentNote })}</p>}

        {mine === 'SELECTED' && !started && (
          <section className="tw-card" aria-labelledby="attend-title" data-testid="attendance">
            <h2 id="attend-title" className="tw-section-title" style={{ marginTop: 0 }}>{t('vac.attendance.question')}</h2>
            <p className="tw-note">{t('vac.attendance.hint')}</p>
            <div className="tw-two" style={{ marginTop: 12 }}>
              <Button variant="secondary" disabled={busy} data-testid="attend-no"
                onClick={() => void run(() => w.attendance(v.id, false))}>{t('vac.attendance.no')}</Button>
              <Button loading={busy} data-testid="attend-yes"
                onClick={() => void run(() => w.attendance(v.id, true))}>{t('vac.attendance.yes')}</Button>
            </div>
          </section>
        )}

        <div className="tw-badges">
          {v.categoryName && <Badge variant="category">{v.categoryName}</Badge>}
          {mine && <VacancyStatus v={v} application={mine} />}
        </div>
        <div className="tw-title-row">
          <h1>{v.title}</h1>
          <CompatibilityRing size={52} value={match} label={t('tw.compatibility', { value: match })} />
        </div>
        <TranslatedNote v={v} />

        <div className="tw-card small tw-company-card">
          <span className="box" aria-hidden="true"><Building2 size={22} strokeWidth={1.75} /></span>
          <div><div className="name">{v.employer.name}</div></div>
        </div>

        <div className="tw-tiles">
          <InfoTile icon={<CalendarDays size={16} aria-hidden="true" />} label={t('vac.dates')} value={f.dates(v)} />
          <InfoTile icon={<Clock size={16} aria-hidden="true" />} label={t('tw.schedule')} value={f.hours(v)} />
          <InfoTile icon={<MapPin size={16} aria-hidden="true" />} label={t('tw.distance')} value={f.km(distanceKm)} />
          <InfoTile icon={<Users size={16} aria-hidden="true" />} label={t('vac.people')} value={t('vac.peopleNeeded', { count: v.workersNeeded })} />
        </div>

        <div className="tw-meta"><MapPin size={16} aria-hidden="true" /><span>{v.addressText}</span></div>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.whatToDo')}</h2>
          <p className="tw-paragraph">{v.description}</p>
        </section>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('vac.items')}</h2>
          {v.requirements.length > 0 ? (
            <ul className="tw-reqs">
              {v.requirements.map((r) => <li key={r}><CircleCheck size={20} aria-hidden="true" />{r}</li>)}
            </ul>
          ) : (
            <p className="tw-note">{t('vac.noItems')}</p>
          )}
        </section>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('tw.payment')}</h2>
          <div className="tw-card tw-pay">
            <div className="tw-pay-row"><span>{t('tw.payPerDay')}</span><b>{money(v.payPerDayMinor)}</b></div>
            <div className="tw-pay-row"><span>{t('vac.days')}</span><b>{t('vac.daysCount', { count: v.days })}</b></div>
            <div className="tw-pay-row total"><span>{t('tw.youGet')}</span><b>{total}</b></div>
          </div>
        </section>
        <p className="tw-note">{t('vac.payNote')}</p>
        {error && <p className="tw-inline-error" role="alert">{error}</p>}
      </div>

      {canApply && (
        <ActionBar>
          <Button variant="secondary" disabled={busy} onClick={back}>{t('vac.notNow')}</Button>
          <Button data-testid="apply" loading={busy} onClick={() => void run(() => w.apply(v.id))}>{t('vac.applyFor', { amount: total })}</Button>
        </ActionBar>
      )}
      {canWithdraw && mine !== 'SELECTED' && (
        <div className="tw-actionbar single">
          <Button variant="secondary" loading={busy} onClick={() => void run(() => w.withdraw(v.id))}>{t('vac.withdraw')}</Button>
        </div>
      )}
    </div>
  );
}
