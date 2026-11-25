import { CalendarDays, MapPin, Star, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../design/components';
import { formatRating } from '../design/format';
import { useFormat } from '../design/useFormat';
import { workerTotal } from '../vacancies/logic';
import { useWorker } from './WorkerContext';

/**
 * Alerta de vacante recomendada (sección 6.2 del documento, adaptada a vacantes): aparece sobre cualquier
 * pantalla cuando se publica una vacante cerca del trabajador disponible. Las vacantes no vencen como las
 * ofertas automáticas, así que no hay cuenta regresiva: se postula, la ve o la deja para después.
 */
export function VacancyAlert() {
  const { alert, dismissAlert } = useWorker();
  const { pathname } = useLocation();
  if (!alert || pathname === `/vacantes/${alert.vacancy.id}`) return null;
  return <Modal key={alert.vacancy.id} onClose={dismissAlert} />;
}

function Modal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alert, apply, errorText } = useWorker();
  const f = useFormat();
  const dialog = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Foco dentro del modal mientras está abierto; Escape lo cierra.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled])')];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  if (!alert) return null;
  const v = alert.vacancy;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await apply(alert);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="tw-backdrop">
      <div ref={dialog} className="tw-modal" role="dialog" aria-modal="true" aria-labelledby="tw-alert-title" aria-describedby="tw-alert-head">
        <div className="tw-modal-head">
          <Zap size={20} aria-hidden="true" />
          <p id="tw-alert-head">{t('vac.alert', { value: alert.match })}</p>
        </div>
        <div className="tw-modal-body">
          <h2 id="tw-alert-title">{v.title}</h2>
          <div className="tw-company">
            <span>{v.employer.name}</span>
            {v.employer.ratingCount > 0 && (
              <>· <Star size={14} className="star" fill="currentColor" aria-hidden="true" /><b>{formatRating(v.employer.ratingAvg)}</b></>
            )}
          </div>
          <div className="tw-pills">
            <span className="tw-pill"><MapPin size={16} aria-hidden="true" />{f.km(alert.distanceKm)}</span>
            <span className="tw-pill"><CalendarDays size={16} aria-hidden="true" />{t('vac.daysCount', { count: v.days })} · {f.day(v.startDate, v.timezone)}</span>
          </div>
          <div className="tw-amount-row">
            <span>{f.hours(v)}</span>
            <strong>{f.money(workerTotal(v), v.currency, v.moneyScale)}</strong>
          </div>
          {error && <p className="tw-inline-error" role="alert">{error}</p>}
          <div className="tw-two">
            <Button variant="secondary" disabled={busy} onClick={() => { onClose(); navigate(`/vacantes/${v.id}`); }}>
              {t('vac.seeDetail')}
            </Button>
            <Button data-testid="alert-apply" loading={busy} onClick={() => void run()}>{t('vac.apply')}</Button>
          </div>
          <button type="button" className="link-btn" style={{ width: '100%', textAlign: 'center', marginTop: 8 }} onClick={onClose}>
            {t('vac.notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
