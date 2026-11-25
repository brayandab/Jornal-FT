import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Zap } from 'lucide-react';

// Componentes base de la app del trabajador (sección 5 de documento.md). Estilos en worker.css.

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

/** Botón de 52 px. Cargando: spinner, mismo texto y no se puede pulsar dos veces. */
export function Button({ variant = 'primary', loading = false, disabled, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`tw-btn ${variant} ${className ?? ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="tw-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  dot?: boolean;
  children: ReactNode;
}

/** Círculo blanco de 44 px con sombra; siempre con aria-label. */
export function IconButton({ label, dot, children, className, ...rest }: IconButtonProps) {
  return (
    <button type="button" className={`tw-icon-btn ${className ?? ''}`} aria-label={label} {...rest}>
      {children}
      {dot && <span className="dot" aria-hidden="true" />}
    </button>
  );
}

export function Card({ small, className, children }: { small?: boolean; className?: string; children: ReactNode }) {
  return <div className={`tw-card ${small ? 'small' : ''} ${className ?? ''}`}>{children}</div>;
}

export function StatCard({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="tw-card small tw-stat">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Switch({
  checked, onChange, disabled, label,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="tw-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Badge({ variant, children }: { variant: 'urgent' | 'category' | 'success'; children: ReactNode }) {
  return (
    <span className={`tw-badge ${variant}`}>
      {variant === 'urgent' && <Zap size={14} strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Chip({
  icon, pressed, onClick, children,
}: { icon?: ReactNode; pressed?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className="tw-chip" aria-pressed={pressed} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

function Ring({
  size, fraction, className, children, ariaLabel,
}: { size: number; fraction: number; className?: string; children: ReactNode; ariaLabel?: string }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div className={`tw-ring ${className ?? ''}`} style={{ width: size, height: size }} role={ariaLabel ? 'img' : undefined} aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="arc" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
      </svg>
      <span aria-hidden={ariaLabel ? 'true' : undefined}>{children}</span>
    </div>
  );
}

/** Anillo verde con el porcentaje de compatibilidad (pendiente 10.4: verde siempre). */
export function CompatibilityRing({ value, size = 48, label }: { value: number; size?: number; label: string }) {
  return (
    <Ring size={size} fraction={value / 100} ariaLabel={label}>
      {value}%
    </Ring>
  );
}

/** Cuenta regresiva en blanco sobre el encabezado primario. No se anuncia cada segundo (aria-hidden). */
export function CountdownRing({ seconds, total, size = 44 }: { seconds: number; total: number; size?: number }) {
  return (
    <div aria-hidden="true">
      <Ring size={size} fraction={total > 0 ? seconds / total : 0} className="countdown">
        {seconds}
      </Ring>
    </div>
  );
}

export function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="tw-tile">
      <span className="label">{icon}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="tw-meta">
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="tw-actionbar">{children}</div>;
}

export function Skeleton({ height, style }: { height: number; style?: CSSProperties }) {
  return <div className="tw-skeleton" style={{ height, ...style }} aria-hidden="true" />;
}

export function ErrorState({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div className="tw-card tw-error" role="alert">
      <p>{message}</p>
      <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>
    </div>
  );
}
