import { Bell, CheckCircle2, Megaphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { InboxItem } from '../api/types';
import { Button, ErrorState, Skeleton } from '../design/components';
import { useFormat } from '../design/useFormat';
import { useApp } from '../state/AppContext';
import { vacancyApi } from '../vacancies/api';
import { friendlyError } from '../api/errors';
import { useVacancyQuery } from '../vacancies/hooks';
import { useShell } from './ShellContext';

const ICON: Record<string, LucideIcon> = { CONFIRM_ATTENDANCE: CheckCircle2, VIEW_VACANCY: Megaphone };

/**
 * Mensajes: avisos del backend (bandeja de notificaciones), ya escritos en el idioma de cada persona y del más
 * reciente al más viejo. El aviso de contratación trae el botón «¿Puedes asistir?».
 */
export function MessagesScreen() {
  const { t } = useTranslation();
  const { locale, role } = useApp();
  const { refreshUnread } = useShell();
  const f = useFormat();
  const inbox = useVacancyQuery(() => api.inbox(50), [locale]);
  // Postulaciones del trabajador: el botón de asistencia solo se muestra si aún está por confirmar.
  const mine = useVacancyQuery(() => (role === 'WORKER' ? vacancyApi.myApplications() : Promise.resolve([])), [role]);

  const open = (n: InboxItem) => {
    if (!n.readAt) void api.markRead(n.id).then(refreshUnread).catch(() => undefined);
  };

  return (
    <div>
      <div className="tw-page-head"><h1>{t('shell.nav.messages')}</h1></div>
      {inbox.loading && !inbox.data ? (
        <div className="tw-offers"><Skeleton height={80} /><Skeleton height={80} /></div>
      ) : inbox.error ? (
        <ErrorState message={t('errors.generic')} retryLabel={t('tw.retry')} onRetry={inbox.reload} />
      ) : (inbox.data ?? []).length === 0 ? (
        <div className="tw-card tw-empty"><strong>{t('inbox.none')}</strong></div>
      ) : (
        <ul className="tw-offers">
          {inbox.data!.map((n) => {
            const Icon = (n.action && ICON[n.action]) || Bell;
            const pending = n.action === 'CONFIRM_ATTENDANCE' && n.vacancyId
              && mine.data?.some((a) => a.vacancyId === n.vacancyId && a.status === 'SELECTED');
            const content = (
              <div className="tw-person" style={{ alignItems: 'flex-start' }}>
                <span className="tw-cat-icon" aria-hidden="true" style={{ width: 40, height: 40 }}><Icon size={20} /></span>
                <div>
                  <strong>{n.title}</strong>
                  <p className="tw-paragraph" style={{ fontSize: 14 }}>{n.body}</p>
                  <span className="tw-note">{f.instant(n.createdAt)}</span>
                </div>
                {!n.readAt && <span className="tw-unread-dot" aria-label={t('shell.unreadOne')} />}
              </div>
            );
            return (
              <li key={n.id}>
                {n.vacancyId ? (
                  <Link to={`/vacantes/${n.vacancyId}`} className="tw-card tw-offer" onClick={() => open(n)}>{content}</Link>
                ) : (
                  <button type="button" className="tw-card tw-offer" style={{ width: '100%', textAlign: 'left', font: 'inherit' }} onClick={() => open(n)}>
                    {content}
                  </button>
                )}
                {pending && <AttendanceButtons vacancyId={n.vacancyId!} onDone={() => open(n)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Botones del aviso de contratación: confirma que irá (para no dejar la vacante tirada) o libera el cupo. */
function AttendanceButtons({ vacancyId, onDone }: { vacancyId: string; onDone: () => void }) {
  const { t } = useTranslation();
  const { showToast } = useShell();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = async (attending: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await vacancyApi.attendance(vacancyId, attending);
      showToast({ text: attending ? t('vac.attendance.confirmedToast') : t('vac.attendance.declinedToast') });
      onDone();
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tw-card small" data-testid="attendance-inbox" style={{ marginTop: 6 }}>
      <strong>{t('vac.attendance.question')}</strong>
      <div className="tw-two" style={{ marginTop: 8 }}>
        <Button variant="secondary" disabled={busy} onClick={() => void answer(false)}>{t('vac.attendance.no')}</Button>
        <Button loading={busy} onClick={() => void answer(true)}>{t('vac.attendance.yes')}</Button>
      </div>
      {error && <p className="tw-inline-error" role="alert">{error}</p>}
    </div>
  );
}
