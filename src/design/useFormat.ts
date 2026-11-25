import { useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { lastDay } from '../vacancies/logic';
import type { Vacancy } from '../vacancies/types';
import { formatDay, formatKm, formatMoneyCompact } from './format';

/** Fecha local "YYYY-MM-DD" como mediodía UTC, para formatearla sin que la zona la mueva de día. */
function asDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Hora local "HH:mm" formateada en el idioma ("7:00 a. m."). */
function hour(time: string, locale: string, cycle?: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
    hourCycle: cycle === 'h23' || cycle === 'h12' ? cycle : undefined,
  }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

/** Formatos de la sección 3 del documento con el idioma de la interfaz y el perfil del país. */
export function useFormat() {
  const { locale, profile } = useApp();
  return useMemo(() => {
    const cycle = profile?.hourCycle;
    const currency = profile?.currency ?? 'USD';
    const scale = profile?.moneyScale ?? 0;
    const day = (date: string, timeZone?: string) => formatDay(asDate(date), locale, 'UTC', todayIn(timeZone));
    return {
      money: (minor: number | null | undefined, cur = currency, sc = scale) =>
        minor === null || minor === undefined ? '—' : formatMoneyCompact(minor, cur, sc, locale),
      km: (km: number) => formatKm(km, locale),
      hour: (time: string) => hour(time, locale, cycle),
      hours: (v: Pick<Vacancy, 'startTime' | 'endTime'>) => `${hour(v.startTime, locale, cycle)} – ${hour(v.endTime, locale, cycle)}`,
      day,
      /** Siempre la fecha ("jue 26 nov"), nunca "Hoy" o "Mañana": para citas que se leen después. */
      dayAbs: (date: string) => formatDay(asDate(date), locale, 'UTC', new Date(0)),
      /** "Hoy", "sáb 28 nov" o "sáb 28 nov – lun 30 nov". */
      dates: (v: Pick<Vacancy, 'startDate' | 'days' | 'timezone'>) =>
        v.days > 1 ? `${day(v.startDate, v.timezone)} – ${day(lastDay(v), v.timezone)}` : day(v.startDate, v.timezone),
      instant: (iso: string) =>
        new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)),
    };
  }, [locale, profile]);
}

/** "Ahora" visto desde la zona del lugar, como mediodía UTC de ese día (para comparar con asDate). */
function todayIn(timeZone?: string): Date {
  const d = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return asDate(d);
}
