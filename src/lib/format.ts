// Formatos con Intl y las anulaciones del perfil regional.
// El dinero viaja siempre en unidades menores (enteros) y solo se convierte al mostrarlo.

export interface MoneyFormat {
  currency: string;
  /** Decimales que usa el país (COP 0, BRL 2, USD 2, EUR 2, JPY 0). Puede diferir de ISO 4217. */
  moneyScale: number;
}

export function formatMoney(minor: number | null | undefined, fmt: MoneyFormat, locale: string): string {
  if (minor === null || minor === undefined) return '—';
  const scale = fmt.moneyScale ?? 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: fmt.currency,
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
  }).format(minor / 10 ** scale);
}

/** Convierte un monto escrito por la persona (en unidades mayores) a unidades menores. */
export function toMinor(major: number, moneyScale: number): number {
  return Math.round(major * 10 ** moneyScale);
}

export function fromMinor(minor: number, moneyScale: number): number {
  return minor / 10 ** moneyScale;
}

/** h12 / h23 del perfil al formato de Intl. */
function hourCycle(cycle?: string): Intl.DateTimeFormatOptions['hourCycle'] {
  return cycle === 'h12' || cycle === 'h23' || cycle === 'h11' || cycle === 'h24' ? cycle : undefined;
}

/** Un instante (UTC) mostrado en una zona IANA: la del lugar del pedido o la de quien lo ve. */
export function formatInstant(
  iso: string | null | undefined,
  locale: string,
  timeZone?: string,
  cycle?: string,
): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
    hourCycle: hourCycle(cycle),
  }).format(new Date(iso));
}

/** Fecha y hora local sin zona ("2026-11-15T20:30"), tal como la guardó el pedido. */
export function formatLocal(local: string | null | undefined, locale: string, cycle?: string): string {
  if (!local) return '—';
  const [d, t = '00:00'] = local.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [hh, mm] = t.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
    hourCycle: hourCycle(cycle),
  }).format(new Date(Date.UTC(y, m - 1, day, hh, mm)));
}

export function formatNumber(value: number, locale: string, digits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

/** Distancia en km o millas según el sistema de medida del país. */
export function formatDistance(km: number | null | undefined, locale: string, system: 'METRIC' | 'US'): string {
  if (km === null || km === undefined) return '—';
  if (system === 'US') {
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'mile', maximumFractionDigits: 1 }).format(km / 1.609344);
  }
  return new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilometer', maximumFractionDigits: 1 }).format(km);
}

/** "YYYY-MM-DDTHH:mm" de ahora + días, en una zona IANA (para el campo datetime-local). */
export function localInputValue(timeZone: string, plusDays = 0, hour = 8): string {
  const now = new Date(Date.now() + plusDays * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return `${parts}T${String(hour).padStart(2, '0')}:00`;
}
