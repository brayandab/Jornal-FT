import {
  Building2, CalendarDays, ChevronLeft, CircleCheck, Clock, MapPin, Share2, ShieldCheck, Star, Users,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionBar, Badge, Button, CompatibilityRing, ErrorState, IconButton, InfoTile, Skeleton } from '../design/components';
import { formatRating } from '../design/format';
import { useFormat } from '../design/useFormat';
import { ZoneMap } from '../design/ZoneMap';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { useVacancyQuery } from '../vacancies/hooks';
import { haversineKm, matchFor, round1, workerTotal } from '../vacancies/logic';
import { vacancyApi } from '../vacancies/mockStore';
import { VacancyStatus } from '../vacancies/VacancyCard';
import { useWorker } from './WorkerContext';

/** Detalle de la vacante para el trabajador (sección 6.3): de qué se trata, cuándo, cuánto paga y qué se requiere. */
export function WorkerVacancyScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();
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
  const distanceKm = round1(haversineKm(w.base, { lat: v.latitude, lng: v.longitude }));
  const categoryIds = w.profile?.categories?.map((c) => c.id) ?? [];
  const match = matchFor(distanceKm, w.radiusKm, categoryIds.includes(v.categoryId));
  const mine = v.applications.find((a) => a.worker.workerId === user?.id);
  const myPayout = v.payouts?.find((p) => p.workerId === user?.id);
  const canApply = v.status === 'OPEN' && (!mine || mine.status === 'WITHDRAWN');
  const total = f.money(workerTotal(v), v.currency, v.moneyScale);

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

  const run = async (kind: 'apply' | 'withdraw') => {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'apply') await w.apply({ vacancy: v, distanceKm, match, mine });
      else await w.withdraw(v.id);
    } catch (e) {
      setError(w.errorText(e));
    } finally {
      setBusy(false);
    }
  };

  // Mensaje según la etapa de la postulación
  let banner: { tone: 'ok' | 'warn' | 'info'; text: string } | null = null;
  if (mine?.status === 'APPLIED') banner = { tone: 'info', text: t('vac.banner.applied') };
  if (mine?.status === 'SELECTED' && v.status === 'IN_PROCESS') {
    banner = { tone: 'ok', text: t('vac.banner.selected', { date: f.dayAbs(v.startDate), time: f.hour(v.startTime), address: v.addressText }) };
  }
  if (mine?.status === 'NOT_SELECTED') banner = { tone: 'warn', text: t('vac.banner.notSelected') };
  if (v.status === 'CANCELLED' && mine && mine.status !== 'WITHDRAWN') banner = { tone: 'warn', text: t('vac.banner.cancelled', { reason: v.cancelReason ?? '' }) };
  if (myPayout) {
    banner = { tone: 'ok', text: t('vac.banner.paid', {
      amount: f.money(myPayout.amountMinor, v.currency, v.moneyScale),
      method: t(`payment.${myPayout.method.toLowerCase()}`, { defaultValue: myPayout.method }),
    }) };
  }
  if (!banner && v.status !== 'OPEN') banner = { tone: 'warn', text: t('vac.banner.closed') };

  return (
    <div>
      <div className="tw-detail-map">
        <ZoneMap me={w.base} work={{ lat: v.latitude, lng: v.longitude }} zoom={14} cellKm={0.6} />
        <IconButton className="back" label={t('common.back')} onClick={back}><ChevronLeft size={20} aria-hidden="true" /></IconButton>
        <IconButton className="share" label={t('tw.share')} onClick={() => void share()}><Share2 size={20} aria-hidden="true" /></IconButton>
      </div>

      <div className="tw-detail">
        {banner && <p className={`tw-banner ${banner.tone}`} role="status">{banner.text}</p>}
        <div className="tw-badges">
          <Badge variant="category">{v.categoryName}</Badge>
          {v.urgent && <Badge variant="urgent">{t('tw.urgent')}</Badge>}
          {mine && <VacancyStatus v={v} application={mine} />}
        </div>
        <div className="tw-title-row">
          <h1>{v.title}</h1>
          <CompatibilityRing size={52} value={match} label={t('tw.compatibility', { value: match })} />
        </div>

        <div className="tw-card small tw-company-card">
          <span className="box" aria-hidden="true"><Building2 size={22} strokeWidth={1.75} /></span>
          <div>
            <div className="name">
              {v.employer.name}
              {v.employer.verified && <ShieldCheck size={18} aria-label={t('tw.verifiedCompany')} />}
            </div>
            <div className="tw-company">
              {v.employer.ratingCount > 0 ? (
                <><Star size={14} className="star" fill="currentColor" aria-hidden="true" />
                  <b>{formatRating(v.employer.ratingAvg)}</b><span>({v.employer.ratingCount})</span></>
              ) : (
                <span>{t(`vac.employerKind.${v.employer.kind}`)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="tw-tiles">
          <InfoTile icon={<CalendarDays size={16} aria-hidden="true" />} label={t('vac.dates')} value={f.dates(v)} />
          <InfoTile icon={<Clock size={16} aria-hidden="true" />} label={t('tw.schedule')} value={f.hours(v)} />
          <InfoTile icon={<MapPin size={16} aria-hidden="true" />} label={t('tw.distance')} value={f.km(distanceKm)} />
          <InfoTile icon={<Users size={16} aria-hidden="true" />} label={t('vac.people')} value={t('vac.peopleNeeded', { count: v.workersNeeded })} />
        </div>

        <div className="tw-meta"><MapPin size={16} aria-hidden="true" /><span>{v.addressText}</span></div>

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('tw.description')}</h2>
          <p className="tw-paragraph">{v.description}</p>
        </section>

        {v.requirements.length > 0 && (
          <section>
            <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('tw.requirements')}</h2>
            <ul className="tw-reqs">
              {v.requirements.map((r) => <li key={r}><CircleCheck size={20} aria-hidden="true" />{r}</li>)}
            </ul>
          </section>
        )}

        <section>
          <h2 className="tw-section-title" style={{ marginTop: 4 }}>{t('tw.payment')}</h2>
          <div className="tw-card tw-pay">
            <div className="tw-pay-row"><span>{t('tw.payPerDay')}</span><b>{f.money(v.payPerDayMinor, v.currency, v.moneyScale)}</b></div>
            <div className="tw-pay-row"><span>{t('vac.days')}</span><b>{t('vac.daysCount', { count: v.days })}</b></div>
            <div className="tw-pay-row"><span>{t('tw.commission', { brand: t('app.name') })}</span><b>{t('tw.paidByClient')}</b></div>
            <div className="tw-pay-row total"><span>{t('tw.youGet')}</span><b>{total}</b></div>
          </div>
        </section>
        <p className="tw-note">{t('vac.payNote')}</p>
        {error && <p className="tw-inline-error" role="alert">{error}</p>}
      </div>

      {canApply && (
        <ActionBar>
          <Button variant="secondary" disabled={busy} onClick={back}>{t('vac.notNow')}</Button>
          <Button data-testid="apply" loading={busy} onClick={() => void run('apply')}>{t('vac.applyFor', { amount: total })}</Button>
        </ActionBar>
      )}
      {mine?.status === 'APPLIED' && v.status === 'OPEN' && (
        <div className="tw-actionbar single">
          <Button variant="secondary" loading={busy} onClick={() => void run('withdraw')}>{t('vac.withdraw')}</Button>
        </div>
      )}
    </div>
  );
}
