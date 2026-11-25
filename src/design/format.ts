// Formatos de la app del trabajador (sección 3 de documento.md).
// Se usa el idioma de la interfaz; en es-CO dan exactamente los ejemplos del mockup.

/** Dinero sin espacio entre el símbolo y el número: "$95.000" (Intl pone "$ 95.000" en es-CO). */
export function formatMoneyCompact(minor: number, currency: string, moneyScale: number, locale: string): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: moneyScale,
    maximumFractionDigits: moneyScale,
  }).formatToParts(minor / 10 ** moneyScale);
  const symbolFirst = parts.findIndex((p) => p.type === 'currency') < parts.findIndex((p) => p.type === 'integer');
  return parts
    .filter((p, i) => !(symbolFirst && p.type === 'literal' && /^\s+$/.test(p.value) && parts[i - 1]?.type === 'currency'))
    .map((p) => p.value)
    .join('');
}

/** "1,2 km" (una cifra decimal, separador del idioma). */
export function formatKm(km: number, locale: string): string {
  const n = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km);
  return `${n} km`;
}

/** "7:00 a. m." en la zona del lugar del trabajo, con el ciclo horario del país. */
export function formatHour(date: Date, locale: string, timeZone?: string, hourCycle?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    hourCycle: hourCycle === 'h23' || hourCycle === 'h12' ? hourCycle : undefined,
  }).format(date);
}

/** "7:00 a. m. – 3:00 p. m." (raya entre espacios). */
export function formatHourRange(start: Date, end: Date, locale: string, timeZone?: string, hourCycle?: string): string {
  return `${formatHour(start, locale, timeZone, hourCycle)} – ${formatHour(end, locale, timeZone, hourCycle)}`;
}

function dayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** "Hoy", "Mañana" o fecha corta ("sáb 28 nov"), en la zona del lugar. */
export function formatDay(date: Date, locale: string, timeZone?: string, now = new Date()): string {
  const target = dayKey(date, timeZone);
  const diff = Math.round((Date.parse(target) - Date.parse(dayKey(now, timeZone))) / 86_400_000);
  if (diff === 0 || diff === 1) {
    const text = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diff, 'day');
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
  }
  // Se respeta el orden de cada idioma, pero los conectores con letras latinas ("de") y la puntuación
  // se cambian por un espacio: "sáb, 28 de nov." → "sáb 28 nov". El japonés (月, 日) queda intacto.
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone })
    .formatToParts(date)
    .map((p) => (p.type === 'literal' && /[a-zà-ÿ,]/i.test(p.value) ? ' ' : p.value.replace(/\.$/, '')))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Calificación con una cifra decimal y punto, como el mockup (pendiente 10.1). */
export function formatRating(value: number | null | undefined): string {
  return (value ?? 0).toFixed(1);
}

/** Saludo según la hora: mañana hasta las 11:59, tarde de 12:00 a 17:59, noche desde las 18:00. */
export function greetingKey(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase())
    .join('');
}
