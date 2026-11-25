import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { uuid } from '../../api/client';
import { api } from '../../api/endpoints';
import type { Quote, RequestDraft } from '../../api/types';
import { AddressForm, cleanAddress, validateAddress } from '../../components/AddressForm';
import { MapView } from '../../components/MapView';
import { QuoteBreakdown } from '../../components/QuoteBreakdown';
import { ErrorBox, Field, Loading, Notice, Select } from '../../components/ui';
import { fromMinor, localInputValue, toMinor } from '../../lib/format';
import { centerOf } from '../../lib/regions';
import { useAction, useAsync } from '../../lib/useAsync';
import { useApp } from '../../state/AppContext';

type TipChoice = { kind: 'none' } | { kind: 'percent'; value: number } | { kind: 'amount'; value: string };

/** Armar el pedido (carrito): cantidad, fecha en la zona del lugar, dirección y mapa, pago, propina y cotización. */
export function OrderPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams();
  const { profile, region, locale } = useApp();
  const navigate = useNavigate();

  const categories = useAsync(() => api.categories(), [locale]);
  const addresses = useAsync(() => api.addresses(), []);
  const category = categories.data?.find((c) => c.id === categoryId);

  const [units, setUnits] = useState(2);
  const [timezone, setTimezone] = useState(profile?.defaultTimezone ?? 'UTC');
  const [scheduledLocal, setScheduledLocal] = useState(() => localInputValue(profile?.defaultTimezone ?? 'UTC', 2));
  const [address, setAddress] = useState<Record<string, string>>({});
  const [point, setPoint] = useState(() => centerOf(region));
  const [payment, setPayment] = useState(profile?.paymentMethods[0]?.code ?? '');
  const [tip, setTip] = useState<TipChoice>(() =>
    profile?.tipMode === 'PROMPT' && profile.tipSuggestedPercents[0]
      ? { kind: 'percent', value: profile.tipSuggestedPercents[0] }
      : { kind: 'none' },
  );
  const [notes, setNotes] = useState('');
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<unknown>(null);
  // Una clave por intento de compra: si la red falla y se reintenta, el backend no crea un segundo pedido.
  const idempotencyKey = useRef(uuid());

  // Al elegir una dirección guardada se copian sus campos.
  useEffect(() => {
    const first = addresses.data?.[0];
    if (first && Object.keys(address).length === 0) setAddress(first.fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses.data]);

  const draft: RequestDraft | null = useMemo(() => {
    if (!profile || !categoryId) return null;
    return {
      categoryId,
      units,
      scheduledLocal,
      timezone,
      address: cleanAddress(address),
      latitude: point.lat,
      longitude: point.lng,
      paymentMethod: payment,
      tipPercent: tip.kind === 'percent' ? tip.value : undefined,
      tipMinor: tip.kind === 'amount' ? toMinor(Number(tip.value || 0), profile.moneyScale) : tip.kind === 'none' ? 0 : undefined,
      notes: notes || undefined,
    };
  }, [profile, categoryId, units, scheduledLocal, timezone, address, point, payment, tip, notes]);

  // Cotización en vivo (el backend calcula subtotal, desplazamiento, impuesto y propina con las reglas del país).
  useEffect(() => {
    if (!draft || units < 1) return;
    const id = setTimeout(() => {
      api.quote(draft).then((q) => { setQuote(q); setQuoteError(null); }).catch((e) => setQuoteError(e));
    }, 350);
    return () => clearTimeout(id);
  }, [draft, units]);

  const create = useAction(async (d: RequestDraft) => api.createRequest(d, idempotencyKey.current));

  if (!profile) return <Loading />;
  if (categories.loading) return <Loading />;
  if (!category) return <ErrorBox error={categories.error} />;

  const submit = async () => {
    const errs = validateAddress(profile.addressSchema, address, profile.postalCodeRegex, t('validation.required'), t('validation.format'));
    setAddrErrors(errs);
    if (Object.keys(errs).length || !draft) return;
    const created = await create.run(draft);
    if (created) navigate(`/requests/${created.id}`, { state: { justCreated: true } });
  };

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition((p) => setPoint({ lat: p.coords.latitude, lng: p.coords.longitude }));

  return (
    <div className="order-layout">
      <div className="stack">
        <h1>{category.name}</h1>
        <section className="card">
          <h2>{t('order.when')}</h2>
          <div className="grid-2">
            <Field label={t('order.units', { unit: t(`units.${category.price?.unit ?? 'DAY'}`, { count: units }) })}
              type="number" min={1} max={30} value={units} onChange={(e) => setUnits(Math.max(1, Number(e.target.value)))} />
            <Field label={t('order.date')} type="datetime-local" value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)} />
          </div>
          {profile.allowedTimezones.length > 1 && (
            <Select label={t('order.timezone')} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {profile.allowedTimezones.map((z) => <option key={z} value={z}>{z}</option>)}
            </Select>
          )}
          <p className="muted small">{t('order.timezoneHint', { zone: timezone })}</p>
        </section>

        <section className="card">
          <h2>{t('order.where')}</h2>
          {addresses.data && addresses.data.length > 0 && (
            <Select label={t('address.saved')} onChange={(e) => {
              const a = addresses.data!.find((x) => x.id === e.target.value);
              if (a) setAddress(a.fields);
            }}>
              {addresses.data.map((a) => <option key={a.id} value={a.id}>{a.label || a.formatted}</option>)}
            </Select>
          )}
          <AddressForm schema={profile.addressSchema} value={address} onChange={setAddress}
            postalCodeRegex={profile.postalCodeRegex} errors={{ ...create.error?.problem.errors, ...addrErrors }} />
          <p className="muted small">{t('order.mapHint')}</p>
          <MapView ariaLabel={t('order.where')} points={[{ ...point, label: t('order.place'), kind: 'place' }]}
            center={point} onPick={(lat, lng) => setPoint({ lat, lng })} />
          <button type="button" className="btn ghost small" onClick={useMyLocation}>{t('order.myLocation')}</button>
        </section>

        <section className="card">
          <h2>{t('order.payment')}</h2>
          <div className="segmented" role="radiogroup" aria-label={t('order.payment')}>
            {profile.paymentMethods.map((m) => (
              <button key={m.code} type="button" role="radio" aria-checked={payment === m.code}
                className={payment === m.code ? 'seg selected' : 'seg'} onClick={() => setPayment(m.code)}>
                <strong>{t(m.labelKey, { defaultValue: m.code })}</strong>
                <small className="muted">{t(`flows.${m.flow}`)}</small>
              </button>
            ))}
          </div>

          {profile.tipMode !== 'HIDDEN' && (
            <>
              <h3 className="h4">{t(profile.tipMode === 'PROMPT' ? 'order.tipPrompt' : 'order.tipOptional')}</h3>
              <div className="chips" role="radiogroup" aria-label={t('order.tip')}>
                <button type="button" role="radio" aria-checked={tip.kind === 'none'}
                  className={tip.kind === 'none' ? 'chip-btn selected' : 'chip-btn'} onClick={() => setTip({ kind: 'none' })}>
                  {t('order.noTip')}
                </button>
                {profile.tipSuggestedPercents.map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={tip.kind === 'percent' && tip.value === p}
                    className={tip.kind === 'percent' && tip.value === p ? 'chip-btn selected' : 'chip-btn'}
                    onClick={() => setTip({ kind: 'percent', value: p })}>
                    {new Intl.NumberFormat(locale, { style: 'percent' }).format(p / 100)}
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={tip.kind === 'amount'}
                  className={tip.kind === 'amount' ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setTip({ kind: 'amount', value: quote ? String(fromMinor(quote.tipMinor, profile.moneyScale)) : '' })}>
                  {t('order.otherTip')}
                </button>
              </div>
              {tip.kind === 'amount' && (
                <Field label={t('order.tipAmount', { currency: profile.currency })} type="number" min={0}
                  step={profile.moneyScale ? 1 / 10 ** profile.moneyScale : 1} value={tip.value}
                  onChange={(e) => setTip({ kind: 'amount', value: e.target.value })} />
              )}
            </>
          )}
          <Field label={t('order.notes')} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
        </section>
      </div>

      <aside className="card summary" aria-live="polite">
        <h2>{t('order.summary')}</h2>
        {quote ? <QuoteBreakdown quote={quote} /> : <Loading />}
        {quoteError ? <ErrorBox error={quoteError as never} /> : null}
        {profile.reviewStatus === 'VERIFICAR' && <p className="muted small">{t('order.verifyNote')}</p>}
        <ErrorBox error={create.error} />
        <button className="btn primary block" data-testid="pay" disabled={create.busy || !quote} onClick={submit}>
          {create.busy ? t('common.loading') : t('order.pay', { method: t(profile.paymentMethods.find((m) => m.code === payment)?.labelKey ?? '', { defaultValue: payment }) })}
        </button>
        <Notice>{t('order.payHint')}</Notice>
      </aside>
    </div>
  );
}
