import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Select } from '../components/ui';
import { Button } from '../design/components';
import { LOCALE_NAMES, UI_LOCALES } from '../i18n';
import { disconnectRealtime } from '../lib/realtime';
import { ProfilePage } from '../pages/ProfilePage';
import { useApp } from '../state/AppContext';
import { WorkerExtraCard } from '../worker/WorkerExtraCard';
import { WorkerProfileCard } from '../worker/WorkerProfileCard';

/** Perfil de cualquier rol: datos de la cuenta y, al final, idioma, país y cerrar sesión. */
export function ProfileScreen() {
  const { t } = useTranslation();
  const { role, locale, setLocale, region, logout } = useApp();
  const navigate = useNavigate();

  const onLogout = async () => {
    disconnectRealtime();
    await logout();
    navigate('/login');
  };

  return (
    <div className="stack">
      {role === 'WORKER' && (
        <>
          <WorkerExtraCard />
          <WorkerProfileCard />
        </>
      )}
      <ProfilePage />
      <section className="card">
        <Select label={t('start.language')} value={locale} onChange={(e) => setLocale(e.target.value)}>
          {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
        </Select>
        <p className="tw-note">{t('auth.inRegion', { region: (region ?? '').toUpperCase() })}</p>
        <Button variant="secondary" onClick={() => void onLogout()} style={{ width: '100%', marginTop: 12 }} data-testid="logout">
          <LogOut size={18} aria-hidden="true" /> {t('nav.logout')}
        </Button>
      </section>
    </div>
  );
}
