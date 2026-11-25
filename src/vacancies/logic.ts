import type { Applicant, LatLng, Vacancy } from './types';

// Reglas del flujo de vacantes (puras, sin estado): costos, fechas, cercanía y viabilidad del postulante.
// Cuando exista el backend, estas reglas viven allá; aquí quedan para la capa simulada y para mostrar resúmenes.

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Lo que recibe un trabajador por toda la vacante. */
export function workerTotal(v: Pick<Vacancy, 'payPerDayMinor' | 'days'>): number {
  return v.payPerDayMinor * v.days;
}

/** Costo para la empresa: pago a los trabajadores + comisión de la app. */
export function employerCost(v: Pick<Vacancy, 'payPerDayMinor' | 'days' | 'commissionBps'>, workers: number) {
  const toWorkers = workerTotal(v) * workers;
  const commission = Math.round((toWorkers * v.commissionBps) / 10_000);
  return { toWorkers, commission, total: toWorkers + commission };
}

/** Fecha local (YYYY-MM-DD) más n días. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function lastDay(v: Pick<Vacancy, 'startDate' | 'days'>): string {
  return addDays(v.startDate, v.days - 1);
}

/** Instante UTC de una fecha y hora locales en una zona IANA. */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Diferencia entre la hora que muestra la zona en ese instante y la pedida.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return new Date(guess - (shown - guess));
}

export function startsAt(v: Pick<Vacancy, 'startDate' | 'startTime' | 'timezone'>): Date {
  return zonedInstant(v.startDate, v.startTime, v.timezone);
}

export function endsAt(v: Pick<Vacancy, 'startDate' | 'days' | 'endTime' | 'timezone'>): Date {
  return zonedInstant(lastDay(v), v.endTime, v.timezone);
}

/** El botón Finalizar se activa al terminar la última jornada (o en demostración). */
export function canFinalize(v: Vacancy, now = new Date()): boolean {
  return v.status === 'IN_PROCESS' && (!!v.demoEnded || now >= endsAt(v));
}

/** Horas de una jornada. */
export function hoursPerDay(v: Pick<Vacancy, 'startTime' | 'endTime'>): number {
  const [a, b] = [v.startTime, v.endTime].map((t) => {
    const [h, m] = t.split(':').map(Number);
    return h + m / 60;
  });
  return Math.max(0, b - a);
}

/**
 * Viabilidad del postulante (0 a 100): cercanía al lugar (35 %), calificación (25 %),
 * trabajos completados (20 %) y si ofrece la categoría de la vacante (20 %).
 */
export function viability(applicant: Applicant, distanceKm: number, categoryId: string, radiusKm = 20): number {
  const near = Math.max(0, 1 - distanceKm / radiusKm);
  const rating = applicant.ratingCount > 0 ? applicant.ratingAvg / 5 : 0.6;
  const experience = Math.min(applicant.completedJobs / 20, 1);
  const category = applicant.categoryIds.includes(categoryId) ? 1 : 0;
  return Math.round(100 * (0.35 * near + 0.25 * rating + 0.2 * experience + 0.2 * category));
}

/** Qué tanto le sirve una vacante a un trabajador (para ordenar y para el anillo de compatibilidad). */
export function matchFor(distanceKm: number, radiusKm: number, categoryMatch: boolean): number {
  const near = Math.max(0, 1 - distanceKm / Math.max(radiusKm, 1));
  return Math.round(100 * (0.6 * near + 0.4 * (categoryMatch ? 1 : 0.3)));
}
