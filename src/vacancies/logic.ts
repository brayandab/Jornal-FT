import type { LatLng, Vacancy } from './types';

// Reglas puras del flujo de vacantes (sin estado): fechas locales, cercanía y compatibilidad.
// Los estados, cupos, puntajes y pagos los decide el backend.

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

/** Fecha local (YYYY-MM-DD) más n días. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function lastDay(v: Pick<Vacancy, 'startDate' | 'days'>): string {
  return addDays(v.startDate, v.days - 1);
}

/** Ya pasó la hora de fin: el empleador puede finalizar o cancelar a cada persona. */
export function hasEnded(v: Pick<Vacancy, 'endsAt'>, now = new Date()): boolean {
  return now.getTime() >= Date.parse(v.endsAt);
}

/** Ya empezó: no se puede contratar, confirmar asistencia ni retirarse. */
export function hasStarted(v: Pick<Vacancy, 'startsAt'>, now = new Date()): boolean {
  return now.getTime() >= Date.parse(v.startsAt);
}

/** Distancia: la que da el backend o, si falta, la calculada desde la ubicación base. */
export function distanceTo(v: Pick<Vacancy, 'distanceKm' | 'latitude' | 'longitude'>, base: LatLng): number {
  return v.distanceKm ?? round1(haversineKm(base, { lat: v.latitude, lng: v.longitude }));
}

/** Qué tanto le sirve una vacante a un trabajador (para ordenar y para el anillo de compatibilidad). */
export function matchFor(distanceKm: number, radiusKm: number, categoryMatch: boolean): number {
  const near = Math.max(0, 1 - distanceKm / Math.max(radiusKm, 1));
  return Math.round(100 * (0.6 * near + 0.4 * (categoryMatch ? 1 : 0.3)));
}
