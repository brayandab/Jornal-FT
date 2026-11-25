import { CalendarDays, Clock, MapPin, Package, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CompatibilityRing, MetaRow } from '../design/components';
import { useFormat } from '../design/useFormat';
import { hasEnded } from './logic';
import type { ApplicationStatus, Vacancy } from './types';

const APP_TONE: Record<ApplicationStatus, string> = {
  APPLIED: 'open', SELECTED: 'process', CONFIRMED: 'done', DECLINED: 'muted', WITHDRAWN: 'muted',
  NOT_SELECTED: 'muted', COMPLETED: 'done', CANCELLED: 'cancel',
};

/** Estado de la vacante (o de la postulación, si se pasa) como píldora. */
export function VacancyStatus({ v, application }: { v: Vacancy; application?: ApplicationStatus | null }) {
  const { t } = useTranslation();
  if (application) {
    return <span className={`tw-status ${APP_TONE[application]}`}>{t(`vac.application.${application}`)}</span>;
  }
  // Terminada con personas por cerrar: se resalta para que quien contrata finalice o cancele.
  if (v.status === 'FILLED' || v.status === 'OPEN') {
    if (hasEnded(v) && v.filled > 0) return <span className="tw-status process">{t('vac.status.TO_CLOSE')}</span>;
  }
  const tone = { OPEN: 'open', FILLED: 'process', CLOSED: 'done', CANCELLED: 'cancel' }[v.status];
  return <span className={`tw-status ${tone}`}>{t(`vac.status.${v.status}`)}</span>;
}

/** Tarjeta de vacante para el trabajador: compatibilidad, empresa, lugar, fechas y pago. */
export function WorkerVacancyCard({ v, distanceKm, match, application }: {
  v: Vacancy; distanceKm: number; match: number; application?: ApplicationStatus | null;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <li>
      <Link to={`/vacantes/${v.id}`} className="tw-card tw-offer" data-testid="vacancy-card">
        <div className="tw-offer-top">
          <span className="tw-cat-icon" aria-hidden="true"><Package size={22} strokeWidth={1.75} /></span>
          <div className="tw-offer-mid">
            <div className="tw-offer-flags"><span>{f.dates(v)}</span></div>
            <h3 className="tw-offer-title">{v.title}</h3>
            <div className="tw-company"><span>{v.employer.name}</span></div>
          </div>
          <CompatibilityRing value={match} label={t('tw.compatibility', { value: match })} />
        </div>
        <div className="tw-offer-meta">
          <MetaRow icon={<MapPin size={16} aria-hidden="true" />}>{v.addressText} · {f.km(distanceKm)}</MetaRow>
          <MetaRow icon={<Clock size={16} aria-hidden="true" />}>{f.hours(v)}</MetaRow>
        </div>
        <hr className="tw-sep" />
        <div className="tw-offer-foot">
          <span>
            {t('vac.daysCount', { count: v.days })} · {f.money(v.payPerDayMinor, v.currency, v.moneyScale)}/{t('vac.perDay')}
            {application && <> · <VacancyStatus v={v} application={application} /></>}
          </span>
          <strong>{f.money(v.payMinor, v.currency, v.moneyScale)}</strong>
        </div>
      </Link>
    </li>
  );
}

/** Tarjeta de vacante para quien contrata: estado, cupos, fechas y lo que se pagará. */
export function EmployerVacancyCard({ v }: { v: Vacancy }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <li>
      <Link to={`/vacantes/${v.id}`} className="tw-card tw-offer" data-testid="employer-vacancy">
        <div className="tw-offer-foot" style={{ alignItems: 'flex-start' }}>
          <h3 className="tw-offer-title" style={{ margin: 0 }}>{v.title}</h3>
          <VacancyStatus v={v} />
        </div>
        <div className="tw-offer-meta">
          <MetaRow icon={<CalendarDays size={16} aria-hidden="true" />}>{f.dates(v)} · {f.hours(v)}</MetaRow>
          <MetaRow icon={<Users size={16} aria-hidden="true" />}>
            {t('vac.hiredOf', { count: v.filled, needed: v.workersNeeded })}
            {v.applicantsCount != null && <> · {t('vac.applicants', { count: v.applicantsCount })}</>}
          </MetaRow>
          <MetaRow icon={<MapPin size={16} aria-hidden="true" />}>{v.addressText}</MetaRow>
        </div>
        <hr className="tw-sep" />
        <div className="tw-offer-foot">
          <span>{t('vac.payPerPerson')}</span>
          <strong>{f.money(v.payMinor, v.currency, v.moneyScale)}</strong>
        </div>
      </Link>
    </li>
  );
}
