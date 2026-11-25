import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { REGIONS } from '../config';
import { ErrorBox, Loading, Select } from '../components/ui';
import { LOCALE_NAMES, UI_LOCALES, resolveUiLocale } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

/** Pantalla inicial: país (fija la región /api/{país}) e idioma. */
export function StartPage() {
  const { t } = useTranslation();
  const { region, locale, chooseRegion, setLocale } = useApp();
  const navigate = useNavigate();
  const countries = useAsync(() => api.countries(), [locale]);
  const [picked, setPicked] = useState<string | null>(region ?? (REGIONS.length === 1 ? REGIONS[0] : null));

  const pick = (code: string, defaultLocale: string) => {
    setPicked(code.toLowerCase());
    setLocale(resolveUiLocale(defaultLocale));
  };

  const go = async () => {
    if (!picked) return;
    await chooseRegion(picked, locale);
    navigate('/login');
  };

  return (
    <section className="card narrow">
      <h1>{t('start.title')}</h1>
      <p className="muted">{t('start.subtitle')}</p>

      <h2 className="h3">{t('start.country')}</h2>
      {countries.loading && <Loading />}
      <ErrorBox error={countries.error} />
      <div className="country-grid" role="radiogroup" aria-label={t('start.country')}>
        {countries.data?.map((c) => (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={picked === c.code.toLowerCase()}
            className={picked === c.code.toLowerCase() ? 'country selected' : 'country'}
            onClick={() => pick(c.code, c.defaultLocale)}
          >
            <span className="cc cc-lg" aria-hidden="true">
              {c.code}
            </span>
            <span className="country-name">{c.name}</span>
            <span className="muted small">
              {c.currency} · {c.phonePrefix}
            </span>
          </button>
        ))}
      </div>

      <Select label={t('start.language')} value={locale} onChange={(e) => setLocale(e.target.value)}>
        {UI_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </Select>

      <button className="btn primary block" disabled={!picked} onClick={go}>
        {t('start.continue')}
      </button>
    </section>
  );
}
