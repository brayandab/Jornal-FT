import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, Field, Notice } from '../components/ui';
import { useAction } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { login, region, profileError } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction(login);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await action.run(email.trim(), password)) navigate('/');
  };

  return (
    <section className="card narrow">
      <h1>{t('auth.loginTitle')}</h1>
      {region && (
        <p className="muted">
          {t('auth.inRegion', { region: region.toUpperCase() })} ·{' '}
          <Link to="/start">{t('start.change')}</Link>
        </p>
      )}
      {profileError && <Notice tone="warn">{t('errors.regionDown')}</Notice>}
      <form onSubmit={submit} noValidate>
        <Field label={t('auth.email')} type="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <Field label={t('auth.password')} type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />
        <ErrorBox error={action.error} />
        <button className="btn primary block" disabled={action.busy || !email || !password}>
          {action.busy ? t('common.loading') : t('auth.login')}
        </button>
      </form>
      <p className="center">
        {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
      </p>
    </section>
  );
}
