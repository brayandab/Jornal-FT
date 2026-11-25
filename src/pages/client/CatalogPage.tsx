import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { ErrorBox, Loading } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import { useApp, useMoney } from '../../state/AppContext';

const ICONS: Record<string, string> = {
  cleaning: '🧽', warehouse: '📦', construction: '🏗️', events: '🎪', gardening: '🌿',
  delivery: '🛵', moving: '🚚', painting: '🎨',
};

/** Catálogo traducido (el core responde en el idioma de Accept-Language) con el precio del país. */
export function CatalogPage() {
  const { t } = useTranslation();
  const { locale, user } = useApp();
  const money = useMoney();
  const [q, setQ] = useState('');
  const categories = useAsync(() => api.categories(), [locale]);
  const shown = categories.data?.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())) ?? [];

  return (
    <div className="stack">
      <div>
        <h1>{t('catalog.hello', { name: user?.givenName })}</h1>
        <p className="muted">{t('catalog.subtitle')}</p>
      </div>
      <input className="search" type="search" placeholder={t('catalog.search')} aria-label={t('catalog.search')}
        value={q} onChange={(e) => setQ(e.target.value)} />
      {categories.loading && <Loading />}
      <ErrorBox error={categories.error} />
      <div className="cards-grid">
        {shown.map((c) => (
          <Link key={c.id} to={`/order/${c.id}`} className="card category" data-slug={c.slug}>
            <span className="category-icon" aria-hidden="true">{ICONS[c.slug] ?? '🛠️'}</span>
            <strong>{c.name}</strong>
            {c.description && <span className="muted small">{c.description}</span>}
            {c.price ? (
              <span className="price">
                {money(c.price.amountMinor, c.price.currency, c.price.moneyScale)}{' '}
                <span className="muted small">/ {t(`units.${c.price.unit}`, { count: 1 })}</span>
              </span>
            ) : (
              <span className="muted small">{t('catalog.noPrice')}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
