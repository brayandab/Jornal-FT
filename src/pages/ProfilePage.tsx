import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/endpoints';
import { AddressForm, cleanAddress, validateAddress } from '../components/AddressForm';
import { ErrorBox, Field, Loading, Notice, Select } from '../components/ui';
import { useAction, useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, role, profile } = useApp();
  if (!user || !profile) return <Loading />;
  return (
    <div className="stack">
      <h1>{t('profile.title')}</h1>
      <PersonalCard />
      {role !== 'ADMIN' && <AddressesCard />}
      {role === 'BUSINESS' && <BusinessCard />}
      <PasswordCard />
      <section className="card">
        <h2>{t('profile.consent')}</h2>
        {user.consentUpToDate ? (
          <Notice tone="ok">{t('profile.consentOk', { law: profile.dataProtectionLaw, version: profile.termsVersion })}</Notice>
        ) : (
          <Notice tone="warn">{t('profile.consentPending', { version: profile.termsVersion })}</Notice>
        )}
      </section>
    </div>
  );
}

function PersonalCard() {
  const { t } = useTranslation();
  const { user, profile, reloadUser } = useApp();
  const [givenName, setGivenName] = useState(user!.givenName);
  const [familyName, setFamilyName] = useState(user!.familyName);
  const [phone, setPhone] = useState(user!.phone ?? '');
  const [saved, setSaved] = useState(false);
  const action = useAction(async () => {
    await api.updateMe({ givenName, familyName, phone: phone || undefined });
    await reloadUser();
    setSaved(true);
  });
  const names = [
    <Field key="g" label={t('auth.givenName')} value={givenName} onChange={(e) => setGivenName(e.target.value)} />,
    <Field key="f" label={t('auth.familyName')} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />,
  ];
  return (
    <section className="card">
      <h2>{t('profile.personal')}</h2>
      <dl className="kv">
        <dt>{t('auth.email')}</dt>
        <dd>{user!.email}</dd>
        <dt>{t('profile.role')}</dt>
        <dd>{t(`roles.${user!.rol}`)}</dd>
        <dt>{t('profile.verification')}</dt>
        <dd>{t(`verification.${user!.verificationState}`)}</dd>
        <dt>{t('profile.country')}</dt>
        <dd>{user!.countryCode}</dd>
      </dl>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); setSaved(false); void action.run(); }}>
        <div className="grid-2">{profile!.nameOrder === 'FAMILY_GIVEN' ? names.reverse() : names}</div>
        <Field label={t('auth.phone')} type="tel" value={phone} hint={t('auth.phoneHint', { prefix: profile!.phonePrefix })}
          onChange={(e) => setPhone(e.target.value)} />
        <ErrorBox error={action.error} />
        {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
        <button className="btn primary" disabled={action.busy}>{t('common.save')}</button>
      </form>
    </section>
  );
}

function AddressesCard() {
  const { t } = useTranslation();
  const { profile } = useApp();
  const list = useAsync(() => api.addresses(), []);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAction(async () => {
    await api.addAddress({ label: label || undefined, fields: cleanAddress(fields) });
    setFields({});
    setLabel('');
    await list.reload();
  });
  const remove = useAction(async (id: string) => {
    await api.deleteAddress(id);
    await list.reload();
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(profile!.addressSchema, fields, profile!.postalCodeRegex, t('validation.required'), t('validation.format'));
    setErrors(errs);
    if (!Object.keys(errs).length) void add.run();
  };

  return (
    <section className="card">
      <h2>{t('address.mine')}</h2>
      {list.loading && <Loading />}
      <ErrorBox error={list.error ?? remove.error} />
      <ul className="list">
        {list.data?.map((a) => (
          <li key={a.id} className="list-row">
            <div>
              <strong>{a.label || t('address.title')}</strong>
              <div className="muted small pre">{a.formatted}</div>
            </div>
            <button className="btn ghost small" onClick={() => remove.run(a.id)}>{t('common.delete')}</button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="muted">{t('address.none')}</li>}
      </ul>
      <details>
        <summary>{t('address.add')}</summary>
        <form onSubmit={submit}>
          <Field label={t('address.label')} value={label} onChange={(e) => setLabel(e.target.value)} />
          <AddressForm schema={profile!.addressSchema} value={fields} onChange={setFields}
            postalCodeRegex={profile!.postalCodeRegex} errors={{ ...add.error?.problem.errors, ...errors }} />
          <ErrorBox error={add.error} />
          <button className="btn primary" disabled={add.busy}>{t('common.save')}</button>
        </form>
      </details>
    </section>
  );
}

function BusinessCard() {
  const { t } = useTranslation();
  const { profile } = useApp();
  const current = useAsync(() => api.business(), []);
  const [legalName, setLegalName] = useState('');
  const [taxIdType, setTaxIdType] = useState('');
  const [taxIdNumber, setTaxIdNumber] = useState('');
  const [billing, setBilling] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const taxTypes = profile!.documentTypes.filter((d) => d.kind === 'TAX');

  useEffect(() => {
    const b = current.data;
    if (!b) return;
    setLegalName(b.legalName ?? '');
    setTaxIdType(b.taxIdType ?? '');
    setTaxIdNumber(b.taxIdNumber ?? '');
    setBilling(b.billingAddress?.fields ?? {});
  }, [current.data]);

  const save = useAction(async () => {
    await api.saveBusiness({
      legalName, taxIdType: taxIdType || taxTypes[0]?.code, taxIdNumber,
      billingAddress: { label: t('business.billingAddress'), fields: cleanAddress(billing) },
    });
    setSaved(true);
  });

  return (
    <section className="card">
      <h2>{t('business.title')}</h2>
      <p className="muted small">{t('business.receiptHint')}</p>
      {current.loading && <Loading />}
      <form onSubmit={(e) => { e.preventDefault(); setSaved(false); void save.run(); }}>
        <Field label={t('business.legalName')} required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        <div className="grid-2">
          <Select label={t('business.taxIdType')} value={taxIdType || taxTypes[0]?.code} onChange={(e) => setTaxIdType(e.target.value)}>
            {taxTypes.map((d) => <option key={d.code} value={d.code}>{t(`documents.${d.code}`, { defaultValue: d.code })}</option>)}
          </Select>
          <Field label={t('business.taxIdNumber')} required value={taxIdNumber} onChange={(e) => setTaxIdNumber(e.target.value)} />
        </div>
        <h3 className="h4">{t('business.billingAddress')}</h3>
        <AddressForm schema={profile!.addressSchema} value={billing} onChange={setBilling}
          postalCodeRegex={profile!.postalCodeRegex} errors={save.error?.problem.errors} />
        <ErrorBox error={save.error} />
        {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
        <button className="btn primary" disabled={save.busy}>{t('common.save')}</button>
      </form>
    </section>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saved, setSaved] = useState(false);
  const action = useAction(async () => {
    await api.changePassword(current, next);
    setCurrent('');
    setNext('');
    setSaved(true);
  });
  return (
    <section className="card">
      <h2>{t('profile.password')}</h2>
      <form onSubmit={(e) => { e.preventDefault(); setSaved(false); void action.run(); }}>
        <div className="grid-2">
          <Field label={t('profile.currentPassword')} type="password" autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} />
          <Field label={t('profile.newPassword')} type="password" autoComplete="new-password" value={next}
            hint={t('validation.passwordLength')} onChange={(e) => setNext(e.target.value)} />
        </div>
        <ErrorBox error={action.error} />
        {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
        <button className="btn" disabled={action.busy || !current || next.length < 8}>{t('profile.changePassword')}</button>
      </form>
    </section>
  );
}
