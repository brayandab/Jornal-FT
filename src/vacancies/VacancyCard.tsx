import { CalendarDays, Clock, MapPin, Package, Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge, CompatibilityRing, MetaRow } from '../design/components';
import { formatRating } from '../design/format';
import { useFormat } from '../design/useFormat';
import { employerCost, workerTotal } from './logic';
import type { Application, Vacancy } from './types';

/** Estado de la vacante (o de la postulación) como píldora. */
export function VacancyStatus({ v, application }: { v: Vacancy; application?: Application }) {
  const { t } = useTranslation();
  if (application) {
    if (application.status === 'SELECTED' && v.status === 'COMPLETED') return <span className="tw-status done">{t('vac.status.PAID')}</span>;
    if (v.status === 'CANCELLED') return <span className="tw-status cancel">{t('vac.status.CANCELLED')}</span>;
    const tone = { APPLIED: 'open', SELECTED: 'done', NOT_SELECTED: 'muted', WITHDRAWN: 'muted' }[application.status];
    return <span className={`tw-status ${tone}`}>{t(`vac.application.${application.status}`)}</span>;
  }
  const tone = { OPEN: 'open', IN_PROCESS: 'process', COMPLETED: 'done', CANCELLED: 'cancel' }[v.status];
  return <span className={`tw-status ${tone}`}>{t(`vac.status.${v.status}`)}</span>;
}

/** Tarjeta de vacante para el trabajador (sección 6.1): compatibilidad, empresa, lugar, fechas y pago. */
export function WorkerVacancyCard({ v, distanceKm, match, application }: {
  v: Vacancy; distanceKm: number; match: number; application?: Application;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <li>
      <Link to={`/vacantes/${v.id}`} className="tw-card tw-offer" data-testid="vacancy-card">
        <div className="tw-offer-top">
          <span className="tw-cat-icon" aria-hidden="true"><Package size={22} strokeWidth={1.75} /></span>
          <div className="tw-offer-mid">
            <div className="tw-offer-flags">
              {v.urgent && <Badge variant="urgent">{t('tw.urgent')}</Badge>}
              <span>{f.dates(v)}</span>
            </div>
            <h3 className="tw-offer-title">{v.title}</h3>
            <div className="tw-company">
              <span>{v.employer.name}</span>
              {v.employer.ratingCount > 0 && (
                <>· <Star size={14} className="star" fill="currentColor" aria-hidden="true" /><b>{formatRating(v.employer.ratingAvg)}</b></>
              )}
            </div>
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
          <strong>{f.money(workerTotal(v), v.currency, v.moneyScale)}</strong>
        </div>
      </Link>
    </li>
  );
}

/** Tarjeta de vacante para quien contrata: estado, postulados o seleccionados, fechas y costo. */
export function EmployerVacancyCard({ v }: { v: Vacancy }) {
  const { t } = useTranslation();
  const f = useFormat();
  const applied = v.applications.filter((a) => a.status === 'APPLIED').length;
  const selected = v.applications.filter((a) => a.status === 'SELECTED').length;
  const cost = employerCost(v, v.status === 'OPEN' ? v.workersNeeded : selected);
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
            {v.status === 'OPEN'
              ? t('vac.applicantsOf', { count: applied, needed: v.workersNeeded })
              : t('vac.selectedCount', { count: selected })}
          </MetaRow>
          <MetaRow icon={<MapPin size={16} aria-hidden="true" />}>{v.addressText}</MetaRow>
        </div>
        <hr className="tw-sep" />
        <div className="tw-offer-foot">
          <span>{v.status === 'COMPLETED' ? t('vac.paidTotal') : t('vac.estimatedCost')}</span>
          <strong>{f.money(cost.total, v.currency, v.moneyScale)}</strong>
        </div>
      </Link>
    </li>
  );
}
