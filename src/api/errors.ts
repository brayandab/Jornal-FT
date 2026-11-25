import type { TFunction } from 'i18next';
import { ApiError } from './client';

/**
 * Mensaje de error para mostrar a la persona: siempre en lenguaje sencillo, nunca un código técnico.
 *  - Errores de negocio del backend (código propio, por ejemplo VAC014_...): su `detail`, que el backend ya
 *    traduce al idioma de la petición.
 *  - Errores genéricos (sesión, permisos, validación, conflicto, caída del servicio, red): un texto propio.
 */
const GENERIC_CODES = new Set([
  'UNAUTHORIZED', 'ACCESS_DENIED', 'VALIDATION_ERROR', 'CONCURRENT_UPDATE', 'INTERNAL_ERROR', 'UNKNOWN', 'ERROR', 'NETWORK', 'NO_REGION',
]);

/** Un `detail` que parece técnico (código, excepción, inglés de framework) no se muestra. */
function technical(detail: string): boolean {
  return /[A-Z]{2,}\d{2,}_|[A-Z]+_[A-Z_]+|Exception|HTTP|\btoken\b|Failed to|request/i.test(detail);
}

export function friendlyError(e: unknown, t: TFunction): string {
  if (!(e instanceof ApiError)) return t('errors.generic');
  const p = e.problem;
  if (p.status === 0) return t('errors.network');
  if (p.status === 502 || p.status === 503 || p.status === 504) return t('errors.regionDown');
  if (p.status === 429) return t('errors.tooMany');
  if (p.status >= 500) return t('errors.generic');
  if (p.code && !GENERIC_CODES.has(p.code) && p.detail && !technical(p.detail)) return p.detail;
  if (p.status === 401) return t('errors.session');
  if (p.status === 403) return t('errors.forbidden');
  if (p.status === 404) return t('errors.notFound');
  if (p.status === 409) return t('errors.conflict');
  if (p.status === 400 || p.status === 422) return t('errors.invalidData');
  return t('errors.generic');
}
