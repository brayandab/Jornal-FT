import { friendlyError } from '../api/errors';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '../api/client';
import type { RequestStatus } from '../api/types';

/** Muestra el error del backend: el `detail` ya viene traducido (Accept-Language). */
export function ErrorBox({ error }: { error: ApiError | null | undefined }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      <span>{friendlyError(error, t)}</span>
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'ok' | 'warn' }) {
  return (
    <div className={`alert alert-${tone}`} role="status">
      {children}
    </div>
  );
}

export function Loading() {
  const { t } = useTranslation();
  return (
    <p className="muted" aria-busy="true">
      {t('common.loading')}
    </p>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, ...input }: FieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {input.required && <span aria-hidden="true"> *</span>}
      </label>
      <input id={id} aria-invalid={!!error} aria-describedby={error || hint ? id + '-msg' : undefined} {...input} />
      {(error || hint) && (
        <small id={id + '-msg'} className={error ? 'field-error' : 'muted'}>
          {error || hint}
        </small>
      )}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function Select({ label, error, children, ...select }: SelectProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-invalid={!!error} {...select}>
        {children}
      </select>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'ok',
  CANCELLED: 'bad',
  FAILED: 'bad',
  EXPIRED: 'bad',
  PENDING_CONFIRMATION: 'warn',
  SEARCHING_WORKER: 'info',
  PENDING_PAYMENT: 'info',
};

export function StatusBadge({ status }: { status: RequestStatus | string }) {
  const { t } = useTranslation();
  return <span className={`badge badge-${STATUS_TONE[status] ?? 'active'}`}>{t(`status.${status}`)}</span>;
}

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label={t('rating.score')}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={String(n)}
            className={n <= value ? 'star on' : 'star'}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ) : (
          <span key={n} className={n <= value ? 'star on' : 'star'} aria-hidden="true">
            ★
          </span>
        ),
      )}
    </div>
  );
}
