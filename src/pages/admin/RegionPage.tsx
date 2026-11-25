import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/endpoints';
import type { RegionProfile } from '../../api/types';
import { ErrorBox, Field, Loading, Notice, Select } from '../../components/ui';
import { fromMinor, toMinor } from '../../lib/format';
import { useAction, useAsync } from '../../lib/useAsync';
import { useApp, useMoney } from '../../state/AppContext';

/**
 * Perfil regional: todo lo que cambia entre países (impuestos, propina, medios de pago, direcciones...).
 * Se editan los valores operativos; el resto se muestra para revisarlo (VERIFICAR / CONFIRMADO).
 */
export function RegionPage() {
  const { t } = useTranslation();
  const { profile, reloadProfile, locale } = useApp();
  const money = useMoney();
  const holidays = useAsync(() => api.holidays(), []);
  const [form, setForm] = useState<Partial<RegionProfile>>({});
  const [travel, setTravel] = useState('');
  const [percents, setPercents] = useState('');
  const [saved, setSaved] = useState(false);
  const [hDate, setHDate] = useState('');
  const [hName, setHName] = useState('');

  useEffect(() => {
    if (!profile) return;
    setForm({
      tipMode: profile.tipMode, commissionBps: profile.commissionBps, pricesIncludeTax: profile.pricesIncludeTax,
      reviewStatus: profile.reviewStatus, source: profile.source,
    });
    setTravel(String(fromMinor(profile.travelFeeMinor, profile.moneyScale)));
    setPercents(profile.tipSuggestedPercents.join(', '));
  }, [profile]);

  const save = useAction(async () => {
    // El PUT pide el perfil completo con su versión (bloqueo optimista).
    const { code: _code, updatedAt: _updatedAt, ...rest } = profile!;
    await api.saveRegionProfile({
      ...rest,
      ...form,
      travelFeeMinor: toMinor(Number(travel), profile!.moneyScale),
      tipSuggestedPercents: percents.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0),
    });
    await reloadProfile();
    setSaved(true);
  });
  const addHoliday = useAction(async () => {
    await api.saveHoliday(hDate, hName);
    setHDate('');
    setHName('');
    await holidays.reload();
  });
  const delHoliday = useAction(async (d: string) => {
    await api.deleteHoliday(d);
    await holidays.reload();
  });

  if (!profile) return <Loading />;
  const pct = (bps: number) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(bps / 10_000);

  return (
    <div className="stack">
      <h1>{t('admin.region', { code: profile.code })}</h1>
      {profile.reviewStatus === 'VERIFICAR' && <Notice tone="warn">{t('admin.verifyValues')}</Notice>}

      <section className="card">
        <h2>{t('admin.summary')}</h2>
        <dl className="kv">
          <dt>{t('admin.currency')}</dt><dd>{profile.currency} ({t('admin.decimals', { count: profile.moneyScale })})</dd>
          <dt>{t('admin.locales')}</dt><dd>{profile.supportedLocales.join(', ')}</dd>
          <dt>{t('order.timezone')}</dt><dd>{profile.allowedTimezones.join(', ')}</dd>
          <dt>{t('admin.receiptType')}</dt><dd>{profile.receiptType} ({profile.receiptPrefix})</dd>
          <dt>{t('admin.nameOrder')}</dt><dd>{t(`admin.nameOrders.${profile.nameOrder}`)}</dd>
          <dt>{t('admin.law')}</dt><dd>{profile.dataProtectionLaw}</dd>
          <dt>{t('admin.measurement')}</dt><dd>{profile.measurementSystem}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>{t('admin.taxes')}</h2>
        <table className="table">
          <thead><tr><th>{t('admin.name')}</th><th className="num">%</th><th>{t('admin.source')}</th><th>{t('admin.review')}</th></tr></thead>
          <tbody>
            {profile.taxRules.map((r) => (
              <tr key={r.name + r.validFrom}>
                <th scope="row">{r.name}</th><td className="num">{pct(r.rateBps)}</td>
                <td className="small">{r.source}</td><td><span className="badge badge-warn">{r.reviewStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="h4">{t('order.payment')}</h3>
        <p>{profile.paymentMethods.map((m) => `${t(m.labelKey, { defaultValue: m.code })} (${t(`flows.${m.flow}`)})`).join(' · ')}</p>
        <h3 className="h4">{t('address.title')}</h3>
        <p className="small">{profile.addressSchema.map((f) => t(f.labelKey, { defaultValue: f.fieldKey }) + (f.required ? ' *' : '')).join(' · ')}</p>
      </section>

      <section className="card">
        <h2>{t('admin.operation')}</h2>
        <form onSubmit={(e) => { e.preventDefault(); setSaved(false); void save.run(); }}>
          <div className="grid-2">
            <Select label={t('order.tip')} value={form.tipMode} onChange={(e) => setForm({ ...form, tipMode: e.target.value as RegionProfile['tipMode'] })}>
              {(['PROMPT', 'OPTIONAL', 'HIDDEN'] as const).map((m) => <option key={m} value={m}>{t(`admin.tipModes.${m}`)}</option>)}
            </Select>
            <Field label={t('admin.tipPercents')} value={percents} onChange={(e) => setPercents(e.target.value)} />
            <Field label={t('admin.travelFee', { currency: profile.currency })} type="number" min={0} value={travel}
              hint={money(toMinor(Number(travel || 0), profile.moneyScale))} onChange={(e) => setTravel(e.target.value)} />
            <Field label={t('admin.commission')} type="number" min={0} max={10000} value={form.commissionBps ?? 0}
              hint={pct(form.commissionBps ?? 0)} onChange={(e) => setForm({ ...form, commissionBps: Number(e.target.value) })} />
            <Select label={t('admin.review')} value={form.reviewStatus} onChange={(e) => setForm({ ...form, reviewStatus: e.target.value as RegionProfile['reviewStatus'] })}>
              <option value="VERIFICAR">VERIFICAR</option>
              <option value="CONFIRMADO">CONFIRMADO</option>
            </Select>
            <Field label={t('admin.source')} value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <label className="check">
            <input type="checkbox" checked={!!form.pricesIncludeTax} onChange={(e) => setForm({ ...form, pricesIncludeTax: e.target.checked })} />
            {t('admin.pricesIncludeTax')}
          </label>
          <ErrorBox error={save.error} />
          {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
          <button className="btn primary" disabled={save.busy}>{t('common.save')}</button>
          <p className="muted small">{t('admin.version', { version: profile.version })}</p>
        </form>
      </section>

      <section className="card">
        <h2>{t('admin.holidays')}</h2>
        <ErrorBox error={holidays.error ?? delHoliday.error} />
        <ul className="list">
          {holidays.data?.map((h) => (
            <li key={h.date} className="list-row">
              <span>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(h.date))} · {h.name}</span>
              <button className="btn small ghost" onClick={() => delHoliday.run(h.date)}>{t('common.delete')}</button>
            </li>
          ))}
          {holidays.data?.length === 0 && <li className="muted">{t('admin.noHolidays')}</li>}
        </ul>
        <form className="grid-3" onSubmit={(e) => { e.preventDefault(); void addHoliday.run(); }}>
          <Field label={t('admin.date')} type="date" required value={hDate} onChange={(e) => setHDate(e.target.value)} />
          <Field label={t('admin.name')} required value={hName} onChange={(e) => setHName(e.target.value)} />
          <button className="btn align-end" disabled={addHoliday.busy || !hDate || !hName}>{t('common.add')}</button>
        </form>
        <ErrorBox error={addHoliday.error} />
      </section>
    </div>
  );
}
