import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { InboxItem } from '../api/types';
import { ErrorBox, Loading } from '../components/ui';
import { formatInstant } from '../lib/format';
import { useTopic } from '../lib/realtime';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

/** Avisos de la persona: llegan en su idioma y en vivo por /topic/users.<id>. */
export function InboxPage() {
  const { t } = useTranslation();
  const { user, locale, profile } = useApp();
  const inbox = useAsync(() => api.inbox(50), []);

  useTopic(user ? `/topic/users.${user.id}` : null, (body) => {
    const item = body as InboxItem;
    inbox.setData([item, ...(inbox.data ?? []).filter((x) => x.id !== item.id)]);
  });

  const open = (item: InboxItem) => {
    if (!item.readAt) {
      void api.markRead(item.id).catch(() => undefined);
      inbox.setData((inbox.data ?? []).map((x) => (x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
  };

  return (
    <div className="stack">
      <h1>{t('inbox.title')}</h1>
      {inbox.loading && !inbox.data && <Loading />}
      <ErrorBox error={inbox.error} />
      <ul className="list">
        {inbox.data?.map((n) => (
          <li key={n.id} className={n.readAt ? 'list-row' : 'list-row unread'}>
            <div>
              <strong>{n.title}</strong>
              <p className="small">{n.body}</p>
              <span className="muted small">{formatInstant(n.createdAt, locale, undefined, profile?.hourCycle)}</span>
            </div>
            {n.requestId && (
              <Link className="btn small" to={`/requests/${n.requestId}`} onClick={() => open(n)}>{t('inbox.open')}</Link>
            )}
          </li>
        ))}
        {inbox.data?.length === 0 && <li className="muted">{t('inbox.none')}</li>}
      </ul>
    </div>
  );
}
