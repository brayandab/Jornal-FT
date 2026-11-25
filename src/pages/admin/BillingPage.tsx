import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/endpoints';
import { ErrorBox, Field, Loading, Notice, Select } from '../../components/ui';
import { useAction, useAsync } from '../../lib/useAsync';
import { useApp } from '../../state/AppContext';

interface RevenueRegion {
  region: string;
  currency: string;
  receipts: number;
  billedLocal: number;
  platformRevenueLocal: number;
  taxLocal: number;
  billed: number | null;
  platformRevenue: number | null;
  rate: { pair: string; rate: string; source: string; asOf: string; method: string } | null;
}

interface Revenue {
  currency: string;
  from: string;
  to: string;
  note: string;
  regions: RevenueRegion[];
  totalBilled: number;
  totalPlatformRevenue: number;
  missingRates: string[];
}

const CURRENCIES = ['USD', 'EUR', 'COP', 'BRL', 'JPY'];

/** Tasas de cambio (proveedor simulado o carga manual) y reporte consolidado de ingresos. */
export function BillingPage() {
  const { t } = useTranslation();
  const { locale } = useApp();
  const [currency, setCurrency] = useState('USD');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const report = useAsync(async () => (await api.revenue(currency, from || undefined, to || undefined)) as unknown as Revenue, [currency, from, to]);
  const rates = useAsync(() => api.rates(30), []);
  const refresh = useAction(async () => { await api.refreshRates(); await Promise.all([rates.reload(), report.reload()]); });

  const [base, setBase] = useState('COP');
  const [quote, setQuote] = useState('USD');
  const [rate, setRate] = useState('');
  const [source, setSource] = useState('');
  const manual = useAction(async () => {
    await api.addRate({ base, quote, rate: Number(rate), source });
    setRate('');
    await Promise.all([rates.reload(), report.reload()]);
  });

  const fmt = (v: number | null, cur: string) =>
    v === null ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(v);
  const r = report.data;

  return (
    <div className="stack">
      <h1>{t('admin.billing')}</h1>
      <section className="card">
        <h2>{t('admin.revenue')}</h2>
        <div className="grid-3">
          <Select label={t('admin.reportCurrency')} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Field label={t('admin.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Field label={t('admin.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {report.loading && !r && <Loading />}
        <ErrorBox error={report.error} />
        {r && (
          <>
            <p className="muted small">{t('admin.reportNote')}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('admin.regionCol')}</th><th className="num">{t('admin.receipts')}</th>
                    <th className="num">{t('admin.billedLocal')}</th><th>{t('admin.rate')}</th>
                    <th className="num">{t('admin.billed', { currency: r.currency })}</th>
                    <th className="num">{t('admin.platform', { currency: r.currency })}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.regions.map((x) => (
                    <tr key={x.region}>
                      <th scope="row">{x.region.toUpperCase()}</th>
                      <td className="num">{x.receipts}</td>
                      <td className="num">{fmt(x.billedLocal, x.currency)}</td>
                      <td className="small">
                        {x.rate ? <>{x.rate.pair} = {x.rate.rate}<br /><span className="muted">{x.rate.asOf} · {x.rate.source}</span></> : t('admin.noRate')}
                      </td>
                      <td className="num">{fmt(x.billed, r.currency)}</td>
                      <td className="num">{fmt(x.platformRevenue, r.currency)}</td>
                    </tr>
                  ))}
                  {r.regions.length === 0 && <tr><td colSpan={6} className="muted">{t('admin.noReceipts')}</td></tr>}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={4}>{t('order.total')}</th>
                    <td className="num">{fmt(r.totalBilled, r.currency)}</td>
                    <td className="num">{fmt(r.totalPlatformRevenue, r.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {r.missingRates.length > 0 && <Notice tone="warn">{t('admin.missingRates', { pairs: r.missingRates.join(', ') })}</Notice>}
          </>
        )}
      </section>

      <section className="card">
        <div className="title-row">
          <h2>{t('admin.rates')}</h2>
          <button className="btn small" disabled={refresh.busy} onClick={() => refresh.run()}>{t('admin.refreshRates')}</button>
        </div>
        <ErrorBox error={rates.error ?? refresh.error} />
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t('admin.pair')}</th><th className="num">{t('admin.rate')}</th><th>{t('admin.date')}</th><th>{t('admin.source')}</th></tr></thead>
            <tbody>
              {rates.data?.map((x, i) => (
                <tr key={i}>
                  <th scope="row">{x.base}/{x.quote}</th>
                  <td className="num">{new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(x.rate)}</td>
                  <td>{x.asOf}</td><td className="small">{x.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="h4">{t('admin.manualRate')}</h3>
        <form className="grid-3" onSubmit={(e) => { e.preventDefault(); void manual.run(); }}>
          <Field label={t('admin.base')} value={base} maxLength={3} onChange={(e) => setBase(e.target.value.toUpperCase())} />
          <Field label={t('admin.quote')} value={quote} maxLength={3} onChange={(e) => setQuote(e.target.value.toUpperCase())} />
          <Field label={t('admin.rate')} type="number" step="any" min={0} value={rate} onChange={(e) => setRate(e.target.value)} />
          <Field label={t('admin.source')} value={source} onChange={(e) => setSource(e.target.value)} />
          <button className="btn primary align-end" disabled={manual.busy || !rate || !source}>{t('common.save')}</button>
        </form>
        <ErrorBox error={manual.error} />
      </section>
    </div>
  );
}
