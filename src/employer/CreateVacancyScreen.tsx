import { Building2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import { ClockPicker } from '../components/ClockPicker';
import { AddressForm, cleanAddress, validateAddress } from '../components/AddressForm';
import { MapView } from '../components/MapView';
import { ErrorBox, Field, Loading, Select } from '../components/ui';
import { Button, Chip } from '../design/components';
import { useFormat } from '../design/useFormat';
import { fromMinor, localInputValue, toMinor } from '../lib/format';
import { centerOf } from '../lib/regions';
import { useAction, useAsync } from '../lib/useAsync';
import { useShell } from '../shell/ShellContext';
import { useApp } from '../state/AppContext';
import { vacancyApi } from '../vacancies/api';

const DURATIONS = [1, 3, 7];

/** Publicar una vacante de trabajo temporal (informal, sin contrato): de 1 a 7 días. */
export function CreateVacancyScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, region, locale, user } = useApp();
  const { showToast } = useShell();
  const f = useFormat();
  const categories = useAsync(() => api.categories(), [locale]);
  const addresses = useAsync(() => api.addresses(), []);
  // Dirección del perfil: la de facturación si es comercio; si no, la primera dirección guardada.
  const business = useAsync(() => (user?.rol === 'BUSINESS' ? api.business().catch(() => null) : Promise.resolve(null)), [user?.rol]);
  const profileAddress = business.data?.billingAddress ?? addresses.data?.[0] ?? null;

  const tz = profile?.defaultTimezone ?? 'UTC';
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [requirement, setRequirement] = useState('');
  // Texto para poder borrar el número completo y escribir otro; se valida al publicar.
  const [workersText, setWorkersText] = useState('1');
  const workers = Number.parseInt(workersText, 10) || 0;
  const [startDate, setStartDate] = useState(() => localInputValue(tz, 1).slice(0, 10));
  const [days, setDays] = useState(1);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [timezone, setTimezone] = useState(tz);
  const [address, setAddress] = useState<Record<string, string>>({});
  const [point, setPoint] = useState(() => centerOf(region));
  const [pay, setPay] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const category = categories.data?.find((c) => c.id === categoryId);
  // Al elegir la categoría se propone el precio por jornada del país y un título.
  useEffect(() => {
    if (!category || !profile) return;
    if (category.price) setPay(String(fromMinor(category.price.amountMinor, profile.moneyScale)));
    setTitle((prev) => prev || category.name);
  }, [category, profile]);

  const payMinor = profile && pay ? toMinor(Number(pay), profile.moneyScale) : 0;
  const perPerson = useMemo(() => payMinor * days, [payMinor, days]);

  const publish = useAction(async () => {
    if (!profile || !category) return;
    const v = await vacancyApi.create({
      categoryId, title: title.trim(), description: description.trim(), requirements,
      workersNeeded: workers, startDate, days, startTime, endTime, timezone, address: cleanAddress(address),
      latitude: point.lat, longitude: point.lng, payPerDayMinor: payMinor,
    });
    showToast({ text: t('vac.published') });
    navigate(`/vacantes/${v.id}`, { replace: true });
  });

  if (!profile || categories.loading) return <Loading />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const req = t('validation.required');
    const errs: Record<string, string> = {
      ...validateAddress(profile.addressSchema, address, profile.postalCodeRegex, req, t('validation.format')),
    };
    if (!categoryId) errs.category = req;
    if (!title.trim()) errs.title = req;
    if (!description.trim()) errs.description = req;
    if (workers < 1 || workers > 20) errs.workers = t('vac.validation.workers');
    if (days < 1 || days > 7) errs.days = t('vac.validation.days');
    if (startDate < localInputValue(timezone, 0).slice(0, 10)) errs.startDate = t('vac.validation.startDate');
    if (endTime <= startTime) errs.endTime = t('vac.validation.hours');
    if (payMinor <= 0) errs.pay = req;
    setErrors(errs);
    if (Object.keys(errs).length === 0) void publish.run();
  };

  // Implementos sugeridos: primero los de la categoría elegida y luego los generales.
  const itemSuggestions = (slug?: string) => {
    const specific = slug ? t(`vac.itemsByCategory.${slug}`, { defaultValue: '' }) : '';
    return [...new Set([...specific.split('|'), ...t('vac.itemSuggestions').split('|')].filter(Boolean))];
  };

  const addRequirement = () => {
    const r = requirement.trim();
    if (r && !requirements.includes(r)) setRequirements([...requirements, r]);
    setRequirement('');
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="tw-page-head"><h1>{t('vac.publishTitle')}</h1></div>
      <p className="tw-note" style={{ marginTop: -8 }}>{t('vac.informalHint')}</p>

      <section className="card">
        <h2>{t('vac.whatWork')}</h2>
        <fieldset>
          <legend>{t('admin.category')}</legend>
          <div className="tw-chips" style={{ flexWrap: 'wrap', marginRight: 0 }}>
            {categories.data?.map((c) => (
              <Chip key={c.id} pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>
            ))}
          </div>
          {errors.category && <small className="field-error">{errors.category}</small>}
        </fieldset>
        <Field label={t('vac.title')} required maxLength={80} value={title} error={errors.title} onChange={(e) => setTitle(e.target.value)} />
        <div className="field">
          <label htmlFor="vac-desc">{t('vac.whatToDo')} *</label>
          <textarea id="vac-desc" maxLength={800} value={description} aria-invalid={!!errors.description}
            placeholder={t('vac.descriptionHint')} onChange={(e) => setDescription(e.target.value)} />
          {errors.description && <small className="field-error">{errors.description}</small>}
        </div>
        <div className="field">
          <label htmlFor="vac-req">{t('vac.items')}</label>
          <select aria-label={t('vac.itemsPick')} value="" style={{ marginBottom: 8 }}
            onChange={(e) => {
              const v = e.target.value;
              if (v && !requirements.includes(v)) setRequirements([...requirements, v]);
            }}>
            <option value="">{t('vac.itemsPick')}</option>
            {itemSuggestions(category?.slug).filter((x) => !requirements.includes(x)).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input id="vac-req" aria-label={t('vac.itemsWrite')} value={requirement} placeholder={t('vac.requirementHint')}
              onChange={(e) => setRequirement(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequirement(); } }} />
            <Button variant="secondary" onClick={addRequirement} aria-label={t('common.add')} style={{ height: 48 }}><Plus size={18} /></Button>
          </div>
          <div className="tw-chips" style={{ flexWrap: 'wrap', marginTop: 8, marginRight: 0 }}>
            {requirements.map((r) => (
              <Chip key={r} onClick={() => setRequirements(requirements.filter((x) => x !== r))}
                icon={<X size={14} aria-hidden="true" />}>{r}</Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>{t('vac.whenWork')}</h2>
        <Field label={t('vac.peopleNeededLabel')} type="text" inputMode="numeric" maxLength={3} value={workersText} error={errors.workers}
          onChange={(e) => setWorkersText(e.target.value.replace(/D/g, ''))} />
        <Field label={t('vac.startDate')} type="date" value={startDate} error={errors.startDate} onChange={(e) => setStartDate(e.target.value)} />
        <fieldset>
          <legend>{t('vac.duration')}</legend>
          <div className="tw-days">
            {DURATIONS.map((d) => (
              <Chip key={d} pressed={days === d} onClick={() => setDays(d)}>{d === 7 ? t('vac.oneWeek') : t('vac.daysCount', { count: d })}</Chip>
            ))}
            <Select label={t('vac.otherDuration')} value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{t('vac.daysCount', { count: d })}</option>)}
            </Select>
          </div>
          {errors.days && <small className="field-error">{errors.days}</small>}
        </fieldset>
        <div className="grid-2">
          <ClockPicker label={t('vac.from')} value={startTime} onChange={setStartTime} />
          <ClockPicker label={t('vac.to')} value={endTime} error={errors.endTime} onChange={setEndTime} />
        </div>
        {profile.allowedTimezones.length > 1 && (
          <Select label={t('order.timezone')} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {profile.allowedTimezones.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        )}
        <p className="tw-note">{t('order.timezoneHint', { zone: timezone })}</p>
      </section>

      <section className="card">
        <h2>{t('order.where')}</h2>
        {profileAddress ? (
          <Button variant="secondary" style={{ width: '100%', marginBottom: 12 }} data-testid="use-profile-address"
            onClick={() => setAddress(profileAddress.fields)}>
            <Building2 size={18} aria-hidden="true" />
            {user?.rol === 'BUSINESS' ? t('vac.useBusinessAddress') : t('vac.useProfileAddress')}
          </Button>
        ) : (
          <p className="tw-note">{t('vac.noProfileAddress')}</p>
        )}
        {profileAddress && <p className="tw-note" style={{ marginTop: -6 }}>{profileAddress.formatted} · {t('vac.markOnMap')}</p>}
        {addresses.data && addresses.data.length > 0 && (
          <Select label={t('address.saved')} onChange={(e) => {
            const a = addresses.data!.find((x) => x.id === e.target.value);
            if (a) setAddress(a.fields);
          }}>
            {addresses.data.map((a) => <option key={a.id} value={a.id}>{a.label || a.formatted}</option>)}
          </Select>
        )}
        <AddressForm schema={profile.addressSchema} value={address} onChange={setAddress} postalCodeRegex={profile.postalCodeRegex} errors={errors} />
        <p className="tw-note">{t('order.mapHint')}</p>
        <MapView ariaLabel={t('order.where')} points={[{ ...point, label: t('order.place'), kind: 'place' }]} center={point}
          onPick={(lat, lng) => setPoint({ lat, lng })} height={220} />
      </section>

      <section className="card">
        <h2>{t('tw.payment')}</h2>
        <Field label={t('vac.payPerDayLabel', { currency: profile.currency })} type="number" min={0}
          step={profile.moneyScale ? 1 / 10 ** profile.moneyScale : 1} value={pay} error={errors.pay}
          hint={category?.price ? t('vac.suggestedPay', { amount: f.money(category.price.amountMinor) }) : undefined}
          onChange={(e) => setPay(e.target.value)} />
                <div style={{ marginTop: 12 }}>
          <div className="tw-sum-row"><span>{t('vac.sum.perPerson', { count: days, pay: f.money(payMinor) })}</span><b>{f.money(perPerson)}</b></div>
          <div className="tw-sum-row total"><span>{t('vac.sum.forPeople', { count: workers })}</span><b>{f.money(perPerson * workers)}</b></div>
        </div>
        <p className="tw-note">{t('vac.payAtEnd')}</p>
      </section>

      <ErrorBox error={publish.error} />
      <Button type="submit" loading={publish.busy} data-testid="publish" style={{ width: '100%' }}>{t('vac.publish')}</Button>
    </form>
  );
}
