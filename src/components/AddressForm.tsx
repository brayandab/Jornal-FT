import { useTranslation } from 'react-i18next';
import type { AddressField } from '../api/types';
import { Field } from './ui';

/**
 * Formulario de dirección generado desde el perfil del país (addressSchema): cada país define sus campos,
 * cuáles son obligatorios, su longitud y su formato. No hay reglas por país en el código.
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
  return (
    <div className="grid-2">
      {schema.map((f) => {
        const pattern = f.regex ?? (f.fieldKey === 'postal_code' ? postalCodeRegex : undefined);
        return (
          <Field
            key={f.fieldKey}
            label={t(f.labelKey, { defaultValue: f.fieldKey })}
            required={f.required}
            maxLength={f.maxLength ?? undefined}
            pattern={pattern ? toHtmlPattern(pattern) : undefined}
            value={value[f.fieldKey] ?? ''}
            error={errors?.[f.fieldKey] ?? errors?.[`address.fields.${f.fieldKey}`]}
            onChange={(e) => onChange({ ...value, [f.fieldKey]: e.target.value })}
          />
        );
      })}
    </div>
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
