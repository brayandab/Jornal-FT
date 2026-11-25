import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/endpoints';
import type { AdminCategory, Category } from '../../api/types';
import { ErrorBox, Field, Loading, Notice, Select } from '../../components/ui';
import { UI_LOCALES } from '../../i18n';
import { fromMinor, toMinor } from '../../lib/format';
import { useAction, useAsync } from '../../lib/useAsync';
import { useApp, useMoney } from '../../state/AppContext';

const UNITS = ['DAY', 'HOUR', 'TRIP'];

/** Categorías de la región: alta, activación, traducciones a los idiomas y precio en moneda local. */
export function CategoriesPage() {
  const { t } = useTranslation();
  const { locale } = useApp();
  const admin = useAsync(() => api.adminCategories(), []);
  const priced = useAsync(() => api.categories(), [locale]);
  const [editing, setEditing] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const create = useAction(async () => {
    await api.createCategory({ slug, name });
    setSlug('');
    setName('');
    await admin.reload();
  });
  const toggle = useAction(async (c: AdminCategory) => {
    await api.setCategoryActive(c.id, !c.active);
    await Promise.all([admin.reload(), priced.reload()]);
  });

  return (
    <div className="stack">
      <h1>{t('admin.categories')}</h1>
      {admin.loading && !admin.data && <Loading />}
      <ErrorBox error={admin.error ?? toggle.error} />
      <ul className="list">
        {admin.data?.items.map((c) => {
          const view = priced.data?.find((p) => p.id === c.id);
          return (
            <li key={c.id} className="card">
              <div className="list-row">
                <div>
                  <strong>{view?.name ?? c.name}</strong> <code className="muted small">{c.slug}</code>
                  {!c.active && <span className="badge badge-bad">{t('admin.inactive')}</span>}
                </div>
                <div className="row nowrap">
                  <button className="btn small" onClick={() => setEditing(editing === c.id ? null : c.id)}>{t('common.edit')}</button>
                  <button className="btn small ghost" disabled={toggle.busy} onClick={() => toggle.run(c)}>
                    {c.active ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                </div>
              </div>
              {editing === c.id && <CategoryEditor category={c} view={view} onSaved={() => { void admin.reload(); void priced.reload(); }} />}
            </li>
          );
        })}
      </ul>
      <section className="card">
        <h2>{t('admin.newCategory')}</h2>
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void create.run(); }}>
          <div className="grid-2">
            <Field label={t('admin.slug')} required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Field label={t('admin.name')} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <ErrorBox error={create.error} />
          <button className="btn primary" disabled={create.busy || !slug || !name}>{t('common.create')}</button>
        </form>
      </section>
    </div>
  );
}

function CategoryEditor({ category, view, onSaved }: { category: AdminCategory; view?: Category; onSaved: () => void }) {
  const { t } = useTranslation();
  const { profile } = useApp();
  const money = useMoney();
  const scale = profile?.moneyScale ?? 0;
  const [tlocale, setTlocale] = useState<string>(UI_LOCALES[0]);
  const [tname, setTname] = useState('');
  const [tdesc, setTdesc] = useState('');
  const [unit, setUnit] = useState(view?.price?.unit ?? 'DAY');
  const [amount, setAmount] = useState(view?.price ? String(fromMinor(view.price.amountMinor, scale)) : '');
  const [msg, setMsg] = useState<string | null>(null);

  const translate = useAction(async () => {
    await api.translateCategory(category.id, tlocale, { name: tname, description: tdesc || undefined });
    setMsg(t('common.saved'));
    onSaved();
  });
  const price = useAction(async () => {
    await api.priceCategory(category.id, { unit, amountMinor: toMinor(Number(amount), scale) });
    setMsg(t('common.saved'));
    onSaved();
  });

  return (
    <div className="editor">
      <h3 className="h4">{t('admin.price')}</h3>
      {view?.price && <p className="small muted">{t('admin.currentPrice', { price: money(view.price.amountMinor, view.price.currency, view.price.moneyScale) })}</p>}
      <form className="grid-3" onSubmit={(e) => { e.preventDefault(); void price.run(); }}>
        <Select label={t('admin.unit')} value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u} value={u}>{t(`units.${u}`, { count: 1 })}</option>)}
        </Select>
        <Field label={t('admin.amount', { currency: profile?.currency })} type="number" min={0}
          step={scale ? 1 / 10 ** scale : 1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn primary align-end" disabled={price.busy || amount === ''}>{t('common.save')}</button>
      </form>
      <ErrorBox error={price.error} />

      <h3 className="h4">{t('admin.translations')}</h3>
      <form onSubmit={(e) => { e.preventDefault(); void translate.run(); }}>
        <div className="grid-3">
          <Select label={t('start.language')} value={tlocale} onChange={(e) => setTlocale(e.target.value)}>
            {UI_LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Field label={t('admin.name')} required value={tname} onChange={(e) => setTname(e.target.value)} />
          <Field label={t('admin.description')} value={tdesc} onChange={(e) => setTdesc(e.target.value)} />
        </div>
        <ErrorBox error={translate.error} />
        <button className="btn" disabled={translate.busy || !tname}>{t('admin.saveTranslation')}</button>
      </form>
      {msg && <Notice tone="ok">{msg}</Notice>}
    </div>
  );
}
