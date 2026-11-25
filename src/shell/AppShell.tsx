import {
  BarChart3, Briefcase, ClipboardList, House, Map, MessageCircle, PlusCircle, Settings, Tags, User, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '../api/types';
import { LOCALE_SHORT, UI_LOCALES } from '../i18n';
import { useApp } from '../state/AppContext';
import { VacancyAlert } from '../worker/VacancyAlert';
import { WorkerProvider } from '../worker/WorkerContext';
import { ShellProvider, useShell } from './ShellContext';
import '../design/design.css';

interface NavItem { to: string; key: string; Icon: LucideIcon }

/** Navegación inferior por rol (5 ítems, sección 4 del documento). */
const NAV: Record<Role, NavItem[]> = {
  WORKER: [
    { to: '/', key: 'shell.nav.home', Icon: House },
    { to: '/mapa', key: 'shell.nav.map', Icon: Map },
    { to: '/trabajos', key: 'shell.nav.jobs', Icon: Wallet },
    { to: '/mensajes', key: 'shell.nav.messages', Icon: MessageCircle },
    { to: '/profile', key: 'shell.nav.profile', Icon: User },
  ],
  APPLICANT: [
    { to: '/', key: 'shell.nav.home', Icon: House },
    { to: '/vacantes/nueva', key: 'shell.nav.publish', Icon: PlusCircle },
    { to: '/registro', key: 'shell.nav.registry', Icon: ClipboardList },
    { to: '/mensajes', key: 'shell.nav.messages', Icon: MessageCircle },
    { to: '/profile', key: 'shell.nav.profile', Icon: User },
  ],
  BUSINESS: [
    { to: '/', key: 'shell.nav.home', Icon: House },
    { to: '/vacantes/nueva', key: 'shell.nav.publish', Icon: PlusCircle },
    { to: '/registro', key: 'shell.nav.registry', Icon: ClipboardList },
    { to: '/mensajes', key: 'shell.nav.messages', Icon: MessageCircle },
    { to: '/profile', key: 'shell.nav.profile', Icon: User },
  ],
  ADMIN: [
    { to: '/', key: 'shell.nav.console', Icon: BarChart3 },
    { to: '/admin/users', key: 'shell.nav.users', Icon: Users },
    { to: '/admin/categories', key: 'shell.nav.categories', Icon: Tags },
    { to: '/admin/region', key: 'shell.nav.country', Icon: Settings },
    { to: '/admin/billing', key: 'shell.nav.billing', Icon: Briefcase },
  ],
};

/** Rutas con barra de acciones fija: van sin navegación inferior. */
function withoutNav(pathname: string): boolean {
  return /^\/vacantes\/(?!nueva$)[^/]+(\/finalizar)?$/.test(pathname);
}

/**
 * Armazón de toda la app con el diseño del documento: columna móvil de máximo 480 px (1080 px para el
 * administrador, que trabaja con tablas), navegación inferior por rol, avisos y alertas de vacantes.
 */
export function AppShell() {
  const { user, role } = useApp();
  if (!user || !role) return <PublicShell />;
  return (
    <ShellProvider>
      {role === 'WORKER' ? (
        <WorkerProvider>
          <PrivateShell role={role} />
        </WorkerProvider>
      ) : (
        <PrivateShell role={role} />
      )}
    </ShellProvider>
  );
}

function PrivateShell({ role }: { role: Role }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { toast, unread } = useShell();
  const bare = withoutNav(pathname);
  return (
    <div className="tw">
      <div className={role === 'ADMIN' ? 'tw-column wide' : 'tw-column'}>
        <main className={bare ? 'tw-main no-nav' : 'tw-main'}>
          <Outlet />
        </main>
        {!bare && (
          <nav className="tw-nav" aria-label={t('nav.menu')}>
            {NAV[role].map(({ to, key, Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}>
                <span className="pill" style={{ position: 'relative' }}>
                  <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
                  {to === '/mensajes' && unread > 0 && <span className="tw-nav-dot" aria-label={t('shell.unread', { count: unread })} />}
                </span>
                {t(key)}
              </NavLink>
            ))}
          </nav>
        )}
        {role === 'WORKER' && <VacancyAlert />}
        {toast && (
          <div className="tw-toast" role="status"
            style={bare ? { bottom: 'calc(var(--actionbar-height) + var(--safe-bottom) + 16px)' } : undefined}>
            <span>{toast.text}</span>
            {toast.to && <Link to={toast.to}>{toast.linkText}</Link>}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pantallas sin sesión (país, inicio de sesión y registro): marca, país e idioma arriba. */
function PublicShell() {
  const { t } = useTranslation();
  const { region, locale, setLocale } = useApp();
  return (
    <div className="tw">
      <div className="tw-column">
        <header className="tw-topbar">
          <Link to="/start" className="tw-brand">
            <span className="tw-brand-mark" aria-hidden="true">tY</span>
            {t('app.name')}
          </Link>
          <div className="tw-topbar-right">
            {region && (
              <Link to="/start" className="tw-cc" aria-label={`${t('start.change')} (${region.toUpperCase()})`}>
                {region.toUpperCase()}
              </Link>
            )}
            <select aria-label={t('start.language')} value={locale} onChange={(e) => setLocale(e.target.value)}>
              {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_SHORT[l]}</option>)}
            </select>
          </div>
        </header>
        <main className="tw-main public">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
