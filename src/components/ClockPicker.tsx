import { Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../design/useFormat';

/**
 * Selector de hora con reloj: primero se toca la hora en la esfera (anillo exterior 1–12, interior 13–24/00)
 * y luego los minutos (de 5 en 5). Muestra la hora con el formato del país (12 o 24 horas).
 * El valor es "HH:mm" en 24 horas, igual que un input type="time".
 */
export function ClockPicker({ label, value, onChange, error }: {
  label: string; value: string; onChange: (v: string) => void; error?: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'hour' | 'minute'>('hour');
  const [h, m] = value.split(':').map(Number);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const setHour = (hour: number) => {
    onChange(`${pad(hour)}:${pad(m || 0)}`);
    setStep('minute');
  };
  const setMinute = (minute: number) => {
    onChange(`${pad(h || 0)}:${pad(minute)}`);
    setOpen(false);
  };

  // Posiciones en la esfera: 12 en la parte de arriba, sentido horario.
  const at = (i: number, r: number) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) };
  };
  const hand = step === 'hour'
    ? { ...at(h % 12, h === 0 || h > 12 ? 52 : 80) }
    : { ...at((m || 0) / 5, 80) };

  return (
    <div className="field">
      <label>{label}</label>
      <button type="button" className="tw-time-btn" aria-invalid={!!error} aria-haspopup="dialog"
        onClick={() => { setStep('hour'); setOpen(true); }}>
        <Clock size={18} aria-hidden="true" /> {value ? f.hour(value) : t('clock.choose')}
      </button>
      {error && <small className="field-error">{error}</small>}

      {open && (
        <div className="tw-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div ref={dialog} className="tw-modal tw-clock" role="dialog" aria-modal="true" aria-label={label}>
            <div className="tw-clock-head">
              <button type="button" aria-pressed={step === 'hour'} onClick={() => setStep('hour')}>{pad(h || 0)}</button>
              <span>:</span>
              <button type="button" aria-pressed={step === 'minute'} onClick={() => setStep('minute')}>{pad(m || 0)}</button>
            </div>
            <p className="tw-note" style={{ textAlign: 'center', margin: '0 0 8px' }}>
              {step === 'hour' ? t('clock.pickHour') : t('clock.pickMinute')}
            </p>
            <svg viewBox="0 0 200 200" className="tw-clock-face" role="group" aria-label={step === 'hour' ? t('clock.pickHour') : t('clock.pickMinute')}>
              <circle cx="100" cy="100" r="96" className="dial" />
              <line x1="100" y1="100" x2={hand.x} y2={hand.y} className="hand" />
              <circle cx="100" cy="100" r="3" className="hand-dot" />
              {step === 'hour' ? (
                <>
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i === 0 ? 12 : i;
                    const p = at(i, 80);
                    return <Mark key={`o${hour}`} x={p.x} y={p.y} text={String(hour)} on={h === hour} onPick={() => setHour(hour)} />;
                  })}
                  {Array.from({ length: 12 }, (_, i) => {
                    const hour = i === 0 ? 0 : i + 12;
                    const p = at(i, 52);
                    return <Mark key={`i${hour}`} x={p.x} y={p.y} small text={pad(hour)} on={h === hour} onPick={() => setHour(hour)} />;
                  })}
                </>
              ) : (
                Array.from({ length: 12 }, (_, i) => {
                  const minute = i * 5;
                  const p = at(i, 80);
                  return <Mark key={`m${minute}`} x={p.x} y={p.y} text={pad(minute)} on={m === minute} onPick={() => setMinute(minute)} />;
                })
              )}
            </svg>
            <button type="button" className="link-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => setOpen(false)}>
              {t('clock.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Mark({ x, y, text, on, small, onPick }: { x: number; y: number; text: string; on: boolean; small?: boolean; onPick: () => void }) {
  return (
    <g className={on ? 'mark on' : 'mark'} role="button" tabIndex={0} aria-label={text} aria-pressed={on} onClick={onPick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick())}>
      <circle cx={x} cy={y} r={small ? 12 : 15} />
      <text x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={small ? 10 : 13}>{text}</text>
    </g>
  );
}
