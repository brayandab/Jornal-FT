import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AddressField } from '../api/types';
import { OTHER, formatStreet, parseStreet, placesOf } from '../lib/places';
import type { PlaceData } from '../lib/places';
import { useApp } from '../state/AppContext';
import { Field, Select } from './ui';

/**
 * Formulario de dirección generado desde el perfil del país (addressSchema): cada país define sus campos,
 * cuáles son obligatorios, su longitud y su formato. Si hay datos del país (lib/places), la división
 * (departamento, estado) y la ciudad se eligen de listas en cascada, y la dirección se arma por partes.
 */
export function AddressForm({
  schema,
  value,
  onChange,
  errors,
  postalCodeRegex,
}: {
  schema: AddressField[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  errors?: Record<string, string>;
  postalCodeRegex?: string;
}) {
  const { t } = useTranslation();
  const { region } = useApp();
  const places = placesOf(region);
  const set = (key: string, v: string) => onChange({ ...value, [key]: v });
  const errorOf = (key: string) => errors?.[key] ?? errors?.[`address.fields.${key}`];

  // La división va antes que la ciudad para poder filtrar las ciudades.
  const ordered = [...schema];
  if (places) {
    const pi = ordered.findIndex((f) => f.fieldKey === places.parent);
    const ci = ordered.findIndex((f) => f.fieldKey === places.child);
    if (pi > ci && ci >= 0) ordered.splice(ci, 0, ordered.splice(pi, 1)[0]);
  }

  return (
    <div className="grid-2">
      {ordered.map((f) => {
        const label = t(f.labelKey, { defaultValue: f.fieldKey });
        const common = { label, required: f.required, error: errorOf(f.fieldKey) };
        if (places?.parent === f.fieldKey) {
          return (
            <Choice key={f.fieldKey} {...common} value={value[f.fieldKey] ?? ''}
              options={places.divisions.map((d) => ({ value: d.value, label: d.label }))}
              onChange={(v) => onChange({ ...value, [f.fieldKey]: v, [places.child]: '' })} />
          );
        }
        if (places?.child === f.fieldKey) {
          const division = places.divisions.find((d) => d.value === value[places.parent]);
          const parentLabel = schema.find((s) => s.fieldKey === places.parent);
          return (
            <Choice key={`${f.fieldKey}-${division?.value ?? ''}`} {...common} value={value[f.fieldKey] ?? ''}
              hint={division ? undefined : t('address.pickDivisionFirst', {
                division: parentLabel ? t(parentLabel.labelKey, { defaultValue: parentLabel.fieldKey }) : '',
              })}
              options={(division?.cities ?? []).map((c) => ({ value: c, label: c }))} onChange={(v) => set(f.fieldKey, v)} />
          );
        }
        if (places?.streetField === f.fieldKey && places.streetTypes) {
          return <StreetBuilder key={f.fieldKey} {...common} places={places} value={value[f.fieldKey] ?? ''} onChange={(v) => set(f.fieldKey, v)} />;
        }
        const pattern = f.regex ?? (f.fieldKey === 'postal_code' ? postalCodeRegex : undefined);
        return (
          <Field
            key={f.fieldKey}
            {...common}
            maxLength={f.maxLength ?? undefined}
            pattern={pattern ? toHtmlPattern(pattern) : undefined}
            value={value[f.fieldKey] ?? ''}
            onChange={(e) => set(f.fieldKey, e.target.value)}
          />
        );
      })}
    </div>
  );
}

/** Lista desplegable con la opción «Otro» para escribir un valor que no está en la lista. */
function Choice({ label, required, error, hint, value, options, onChange }: {
  label: string; required: boolean; error?: string; hint?: string; value: string;
  options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const known = value === '' || options.some((o) => o.value === value);
  const [other, setOther] = useState(!known);
  useEffect(() => {
    if (!known) setOther(true);
  }, [known]);

  return (
    <div>
      <Select label={`${label}${required ? ' *' : ''}`} value={other ? OTHER : value} error={other ? undefined : error}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}>
        <option value="">{t('address.choose')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={OTHER}>{t('address.other')}</option>
      </Select>
      {other && (
        <Field label={t('address.writeOther', { field: label })} value={value} maxLength={80} error={error}
          onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && !other && <small className="tw-note">{hint}</small>}
    </div>
  );
}

/** Dirección colombiana por partes: tipo de vía (lista) + número de la vía # número de la cruce - placa. */
function StreetBuilder({ label, required, error, places, value, onChange }: {
  label: string; required: boolean; error?: string; places: PlaceData; value: string; onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const types = places.streetTypes!;
  const [parts, setParts] = useState(() => parseStreet(value, types) ?? { type: types[0], main: '', cross: '', plate: '' });
  // Si llega una dirección guardada con este formato (por ejemplo al elegir una dirección guardada), se separa en partes.
  useEffect(() => {
    const p = parseStreet(value, types);
    if (p && formatStreet(p) !== formatStreet(parts)) setParts(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    onChange(formatStreet(next));
  };

  return (
    <fieldset className="tw-street">
      <legend>{label}{required ? ' *' : ''}</legend>
      <div className="tw-street-row">
        <Select label={t('address.streetType')} value={parts.type} onChange={(e) => update({ type: e.target.value })}>
          {types.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Field label={t('address.streetNumber')} value={parts.main} maxLength={10} placeholder="26"
          onChange={(e) => update({ main: e.target.value })} />
        <span className="tw-street-sep" aria-hidden="true">#</span>
        <Field label={t('address.crossNumber')} value={parts.cross} maxLength={10} placeholder="68"
          onChange={(e) => update({ cross: e.target.value })} />
        <span className="tw-street-sep" aria-hidden="true">-</span>
        <Field label={t('address.plate')} value={parts.plate} maxLength={10} placeholder="35"
          onChange={(e) => update({ plate: e.target.value })} />
      </div>
      {value && <small className="tw-note">{value}</small>}
      {error && <small className="field-error">{error}</small>}
    </fieldset>
  );
}

/** El atributo pattern de HTML ya está anclado: se quitan ^ y $ del regex del perfil. */
function toHtmlPattern(regex: string): string {
  return regex.replace(/^\^/, '').replace(/\$$/, '');
}

/** Valida en el cliente con el mismo esquema (el backend vuelve a validar). */
export function validateAddress(
  schema: AddressField[],
  value: Record<string, string>,
  postalCodeRegex: string | undefined,
  requiredMsg: string,
  formatMsg: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of schema) {
    const v = (value[f.fieldKey] ?? '').trim();
    if (!v) {
      if (f.required) errors[f.fieldKey] = requiredMsg;
      continue;
    }
    const regex = f.regex ?? (f.fieldKey === 'postal_code' ? postalCodeRegex : null);
    if (regex) {
      try {
        if (!new RegExp(regex).test(v)) errors[f.fieldKey] = formatMsg;
      } catch {
        // regex del perfil no compatible con JS: valida el backend
      }
    }
  }
  return errors;
}

/** Quita los campos vacíos antes de enviar. */
export function cleanAddress(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, v.trim()]));
}
