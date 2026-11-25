/**
 * URLs del backend, leídas de las variables de entorno de Vite (se fijan al compilar: `npm run build`).
 * Sin variables, todo va por el gateway con rutas relativas (el proxy de Vite en desarrollo):
 *   core:           /api/{region}
 *   subsistemas:    /subsystems/{payments|dispatch|notifications|billing}
 *   WebSocket:      ws(s)://<misma página>/subsystems/notifications/ws
 * En Render no hay gateway: el core y notificaciones son servicios con su propia URL (ver .env.example).
 */

const env = import.meta.env;

const trimSlash = (url: string) => url.replace(/\/+$/, '');
const value = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/** Base del core. `{region}` se reemplaza por la región (co, br...); sin `{region}` se usa la misma URL para todas. */
const API_BASE_URL = trimSlash(value(env.VITE_API_BASE_URL) ?? '/api/{region}');

/** Base de los subsistemas que siguen detrás del gateway: `{base}/{nombre}`. */
const SUBSYSTEMS_URL = trimSlash(value(env.VITE_SUBSYSTEMS_URL) ?? '/subsystems');

/** Base del servicio de notificaciones (bandeja y avisos). */
const NOTIFICATIONS_URL = trimSlash(value(env.VITE_NOTIFICATIONS_URL) ?? `${SUBSYSTEMS_URL}/notifications`);

/** Regiones que se ofrecen en el selector de país. En Render solo está Colombia: VITE_REGIONS=co. */
export const REGIONS: readonly string[] = (value(env.VITE_REGIONS) ?? 'co,br,us,fr,jp,de')
  .split(',')
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean);

export function coreUrl(region: string): string {
  return API_BASE_URL.replace('{region}', region);
}

export function subsystemUrl(name: string): string {
  return name === 'notifications' ? NOTIFICATIONS_URL : `${SUBSYSTEMS_URL}/${name}`;
}

/** WebSocket (STOMP) de notificaciones: VITE_WS_URL o, si falta, `{notificaciones}/ws` con ws:// o wss://. */
export function notificationsWsUrl(): string {
  const explicit = value(env.VITE_WS_URL);
  if (explicit) return explicit;
  const base = /^https?:\/\//.test(NOTIFICATIONS_URL)
    ? NOTIFICATIONS_URL
    : `${location.protocol}//${location.host}${NOTIFICATIONS_URL}`;
  return `${base.replace(/^http/, 'ws')}/ws`;
}
