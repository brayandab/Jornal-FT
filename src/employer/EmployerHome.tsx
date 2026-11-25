import { Bell, CheckCircle2, ClipboardList, Megaphone, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, ErrorState, IconButton, Skeleton, StatCard } from '../design/components';
import { greetingKey, initials } from '../design/format';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { vacancyApi } from '../vacancies/api';
import { useVacancyQuery } from '../vacancies/hooks';
import { hasEnded } from '../vacancies/logic';
import { EmployerVacancyCard } from '../vacancies/VacancyCard';

/** Inicio de quien contrata (persona o comercio): resumen, vacantes por cerrar y vacantes abiertas. */
export function EmployerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useApp();
  const { unread, employer } = useShell();
  const q = useVacancyQuery(() => (user ? vacancyApi.mine() : Promise.resolve([])), [user?.id]);
  const all = q.data ?? [];
  const active = all.filter((v) => v.status === 'OPEN' || v.status === 'FILLED');
  const toClose = active.filter((v) => hasEnded(v) && v.filled > 0);
  const open = active.filter((v) => !toClose.includes(v));
  const done = all.filter((v) => v.status === 'CLOSED');

  return (
    <div>
      <header className="tw-header">
        <div className="tw-avatar" aria-hidden="true">{initials(employer?.name ?? user?.name ?? '')}</div>
        <div className="tw-greeting">
          <span>{t(`tw.greeting.${greetingKey()}`)}</span>
          <strong>{employer?.name ?? user?.givenName}</strong>
        </div>
        <IconButton label={t('tw.notifications')} dot={unread > 0} onClick={() => navigate('/mensajes')}>
          <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </header>

      <div className="tw-stats">
        <StatCard icon={<Megaphone size={20} aria-hidden="true" />} value={String(open.length)} label={t('vac.stats.open')} />
        <StatCard icon={<ClipboardList size={20} aria-hidden="true" />} value={String(toClose.length)} label={t('vac.stats.toClose')} />
        <StatCard icon={<CheckCircle2 size={20} aria-hidden="true" />} value={String(done.length)} label={t('vac.stats.done')} />
      </div>

      <Button style={{ width: '100%', marginTop: 16 }} onClick={() => navigate('/vacantes/nueva')} data-testid="new-vacancy">
        <Plus size={20} aria-hidden="true" /> {t('vac.publish')}
      </Button>

      {toClose.length > 0 && (
        <>
          <div className="tw-section-head"><h2>{t('vac.stats.toClose')}</h2><span>{t('vac.toCloseHint')}</span></div>
          <ul className="tw-offers">{toClose.map((v) => <EmployerVacancyCard key={v.id} v={v} />)}</ul>
        </>
      )}

      <div className="tw-section-head">
        <h2>{t('vac.openVacancies')}</h2>
        <span>{t('vac.receivingApplications')}</span>
      </div>
      {q.loading && !q.data ? (
        <div className="tw-offers"><Skeleton height={170} /><Skeleton height={170} /></div>
      ) : q.error ? (
        <ErrorState message={t('tw.offersError')} retryLabel={t('tw.retry')} onRetry={q.reload} />
      ) : open.length === 0 ? (
        <div className="tw-card tw-empty">
          <strong>{t('vac.noOpen')}</strong>
          <span>{t('vac.noOpenHint')}</span>
        </div>
      ) : (
        <ul className="tw-offers">{open.map((v) => <EmployerVacancyCard key={v.id} v={v} />)}</ul>
      )}
    </div>
  );
}
