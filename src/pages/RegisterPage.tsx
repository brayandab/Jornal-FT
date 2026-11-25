import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/endpoints';
import type { RegisterRequest, Role } from '../api/types';
import { AddressForm, cleanAddress, validateAddress } from '../components/AddressForm';
import { ErrorBox, Field, Loading, Notice, Select } from '../components/ui';
import { useAction } from '../lib/useAsync';
import { useApp } from '../state/AppContext';

const ROLES: Role[] = ['APPLICANT', 'BUSINESS', 'WORKER'];

/** Registro con formulario generado desde el perfil del país (nombre, teléfono, dirección y datos fiscales). */
export function RegisterPage() {
  const { t } = useTranslation();
  const { profile, profileError, locale, login } = useApp();
  const navigate = useNavigate();

  const [rol, setRol] = useState<Role>('APPLICANT');
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [withAddress, setWithAddress] = useState(false);
  const [address, setAddress] = useState<Record<string, string>>({});
  const [legalName, setLegalName] = useState('');
  const [taxIdType, setTaxIdType] = useState('');
  const [taxIdNumber, setTaxIdNumber] = useState('');
  const [billing, setBilling] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const action = useAction(async (body: RegisterRequest) => {
    await api.register(body);
    return login(body.email, body.password);
  });

  if (profileError) return <ErrorBox error={profileError} />;
  if (!profile) return <Loading />;

  const taxTypes = profile.documentTypes.filter((d) => d.kind === 'TAX');
  const effectiveTaxType = taxIdType || taxTypes[0]?.code || '';
  const serverErrors = action.error?.problem.errors ?? {};
  const err = (k: string) => localErrors[k] ?? serverErrors[k];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const required = t('validation.required');
    const format = t('validation.format');
    const errors: Record<string, string> = {};
    if (!givenName.trim()) errors.givenName = required;
    if (!familyName.trim()) errors.familyName = required;
    if (!email.trim()) errors.email = required;
    if (password.length < 8) errors.password = t('validation.passwordLength');
    if (!accepted) errors.acceptedTerms = t('validation.acceptTerms');
    let addressErrors: Record<string, string> = {};
    if (withAddress) addressErrors = validateAddress(profile.addressSchema, address, profile.postalCodeRegex, required, format);
    let billingErrors: Record<string, string> = {};
    if (rol === 'BUSINESS') {
      if (!legalName.trim()) errors.legalName = required;
      if (!taxIdNumber.trim()) errors.taxIdNumber = required;
      billingErrors = validateAddress(profile.addressSchema, billing, profile.postalCodeRegex, required, format);
    }
    setLocalErrors({ ...errors, ...prefix('address.', addressErrors), ...prefix('billing.', billingErrors) });
    if (Object.keys(errors).length + Object.keys(addressErrors).length + Object.keys(billingErrors).length) return;

    const body: RegisterRequest = {
      email: email.trim(),
      password,
      givenName: givenName.trim(),
      familyName: familyName.trim(),
      phone: phone.trim() || undefined,
      rol,
      locale,
      acceptedTerms: true,
      address: withAddress ? { label: t('address.home'), fields: cleanAddress(address) } : undefined,
      business:
        rol === 'BUSINESS'
          ? {
              legalName: legalName.trim(),
              taxIdType: effectiveTaxType,
              taxIdNumber: taxIdNumber.trim(),
              billingAddress: { label: t('business.billingAddress'), fields: cleanAddress(billing) },
            }
          : undefined,
    };
    if (await action.run(body)) navigate('/');
  };

  const nameFields = [
    <Field key="given" label={t('auth.givenName')} required autoComplete="given-name" value={givenName}
      error={err('givenName')} onChange={(e) => setGivenName(e.target.value)} />,
    <Field key="family" label={t('auth.familyName')} required autoComplete="family-name" value={familyName}
      error={err('familyName')} onChange={(e) => setFamilyName(e.target.value)} />,
  ];

  return (
    <section className="card">
      <h1>{t('auth.registerTitle')}</h1>
      <form onSubmit={submit} noValidate>
        <fieldset>
          <legend>{t('auth.accountType')}</legend>
          <div className="segmented" role="radiogroup">
            {ROLES.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rol === r}
                className={rol === r ? 'seg selected' : 'seg'} onClick={() => setRol(r)}>
                <strong>{t(`roles.${r}`)}</strong>
                <small className="muted">{t(`roles.${r}_hint`)}</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('auth.personal')}</legend>
          {/* El orden del nombre lo da el perfil del país (por ejemplo, en Japón va primero el apellido). */}
          <div className="grid-2">{profile.nameOrder === 'FAMILY_GIVEN' ? nameFields.reverse() : nameFields}</div>
          <div className="grid-2">
            <Field label={t('auth.email')} type="email" required autoComplete="email" value={email}
              error={err('email')} onChange={(e) => setEmail(e.target.value)} />
            <Field label={t('auth.password')} type="password" required autoComplete="new-password" value={password}
              error={err('password')} hint={t('validation.passwordLength')} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="phone-field">
            <span className="phone-prefix" aria-hidden="true">{profile.phonePrefix}</span>
            <Field label={t('auth.phone')} type="tel" autoComplete="tel-national" value={phone} error={err('phone')}
              hint={t('auth.phoneHint', { prefix: profile.phonePrefix })} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('address.title')}</legend>
          <label className="check">
            <input type="checkbox" checked={withAddress} onChange={(e) => setWithAddress(e.target.checked)} />
            {t('address.addNow')}
          </label>
          {withAddress && (
            <AddressForm schema={profile.addressSchema} value={address} onChange={setAddress}
              postalCodeRegex={profile.postalCodeRegex} errors={unprefix('address.', { ...serverErrors, ...localErrors })} />
          )}
        </fieldset>

        {rol === 'BUSINESS' && (
          <fieldset>
            <legend>{t('business.title')}</legend>
            <Field label={t('business.legalName')} required value={legalName} error={err('legalName') ?? err('business.legalName')}
              onChange={(e) => setLegalName(e.target.value)} />
            <div className="grid-2">
              <Select label={t('business.taxIdType')} value={effectiveTaxType} onChange={(e) => setTaxIdType(e.target.value)}>
                {taxTypes.map((d) => (
                  <option key={d.code} value={d.code}>{t(`documents.${d.code}`, { defaultValue: d.code })}</option>
                ))}
              </Select>
              <Field label={t('business.taxIdNumber')} required value={taxIdNumber}
                error={err('taxIdNumber') ?? err('business.taxIdNumber')} onChange={(e) => setTaxIdNumber(e.target.value)} />
            </div>
            <h3 className="h4">{t('business.billingAddress')}</h3>
            <AddressForm schema={profile.addressSchema} value={billing} onChange={setBilling}
              postalCodeRegex={profile.postalCodeRegex} errors={unprefix('billing.', localErrors)} />
          </fieldset>
        )}

        <label className="check">
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
            aria-invalid={!!err('acceptedTerms')} />
          {t('auth.acceptTerms', { law: profile.dataProtectionLaw, terms: profile.termsVersion, privacy: profile.privacyVersion })}
        </label>
        {err('acceptedTerms') && <small className="field-error">{err('acceptedTerms')}</small>}

        {rol === 'WORKER' && <Notice>{t('auth.workerVerification')}</Notice>}
        <ErrorBox error={action.error} />
        <button className="btn primary block" disabled={action.busy}>
          {action.busy ? t('common.loading') : t('auth.createAccount')}
        </button>
      </form>
      <p className="center">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </section>
  );
}

function prefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [p + k, v]));
}

function unprefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).filter(([k]) => k.startsWith(p)).map(([k, v]) => [k.slice(p.length), v]));
}
