import { Bell, CheckCircle2, CircleX, Megaphone, UserPlus, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ErrorState, Skeleton } from '../design/components';
import { useFormat } from '../design/useFormat';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';
import { useVacancyQuery } from '../vacancies/hooks';
import { vacancyApi } from '../vacancies/mockStore';
import type { NoticeKind, VacancyNotice } from '../vacancies/types';
import { useShell } from './ShellContext';

const ICON: Record<NoticeKind, LucideIcon> = {
  SELECTED: CheckCircle2, NOT_SELECTED: CircleX, CANCELLED: CircleX, PAID: Wallet, NEW_APPLICANT: UserPlus, NEARBY: Megaphone,
};

interface Item { id: string; title: string; body: string; at: string; unread: boolean; to?: string; Icon: LucideIcon; onOpen?: () => void }

/** Mensajes: avisos del flujo de vacantes y avisos del backend (bandeja de notificaciones), del más reciente al más viejo. */
export function MessagesScreen() {
  const { t } = useTranslation();
  const { user, locale } = useApp();
  const { refreshUnread } = useShell();
  const f = useFormat();
  const notices = useVacancyQuery(() => (user ? vacancyApi.notices(user.id) : Promise.resolve([])), [user?.id]);
  const inbox = useAsync(() => api.inbox(50).catch(() => []), [locale]);

  const text = (n: VacancyNotice) => {
    const d = n.data;
    const money = typeof d.amount === 'number' ? f.money(d.amount) : '';
    const method = d.method ? t(`payment.${String(d.method).toLowerCase()}`, { defaultValue: String(d.method) }) : '';
    return {
      title: t(`vac.notice.${n.kind}.title`, { title: d.title }),
      body: t(`vac.notice.${n.kind}.body`, {
        ...d, amount: money, method, date: d.date ? f.dayAbs(String(d.date)) : '', time: d.time ? f.hour(String(d.time)) : '',
      }),
    };
  };

  const items: Item[] = [
    ...(notices.data ?? []).map((n) => ({
      id: n.id, ...text(n), at: n.createdAt, unread: !n.read, to: `/vacantes/${n.vacancyId}`, Icon: ICON[n.kind],
      onOpen: () => void vacancyApi.markRead(n.id).then(refreshUnread),
    })),
    ...(inbox.data ?? []).map((n) => ({
      id: n.id, title: n.title, body: n.body, at: n.createdAt, unread: !n.readAt, Icon: Bell,
      onOpen: () => void api.markRead(n.id).then(refreshUnread).catch(() => undefined),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <div className="tw-page-head"><h1>{t('shell.nav.messages')}</h1></div>
      {notices.loading && !notices.data ? (
        <div className="tw-offers"><Skeleton height={80} /><Skeleton height={80} /></div>
      ) : notices.error ? (
        <ErrorState message={t('errors.generic')} retryLabel={t('tw.retry')} onRetry={notices.reload} />
      ) : items.length === 0 ? (
        <div className="tw-card tw-empty"><strong>{t('inbox.none')}</strong></div>
      ) : (
        <ul className="tw-offers">
          {items.map(({ id, title, body, at, unread, to, Icon, onOpen }) => {
            const content = (
              <div className="tw-person" style={{ alignItems: 'flex-start' }}>
                <span className="tw-cat-icon" aria-hidden="true" style={{ width: 40, height: 40 }}><Icon size={20} /></span>
                <div>
                  <strong>{title}</strong>
                  <p className="tw-paragraph" style={{ fontSize: 14 }}>{body}</p>
                  <span className="tw-note">{f.instant(at)}</span>
                </div>
                {unread && <span className="tw-unread-dot" aria-label={t('shell.unreadOne')} />}
              </div>
            );
            return (
              <li key={id}>
                {to ? (
                  <Link to={to} className="tw-card tw-offer" onClick={onOpen}>{content}</Link>
                ) : (
                  <button type="button" className="tw-card tw-offer" style={{ width: '100%', textAlign: 'left', font: 'inherit' }} onClick={onOpen}>
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
