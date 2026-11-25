import { describe, expect, it } from 'vitest';
import { formatDay, formatHourRange, formatKm, formatMoneyCompact, formatRating, greetingKey } from './format';

describe('formatos del trabajador (sección 3)', () => {
  it('dinero sin espacio después del $', () => {
    expect(formatMoneyCompact(95000, 'COP', 0, 'es-CO')).toBe('$95.000');
  });

  it('no toca el orden de monedas con símbolo al final', () => {
    expect(formatMoneyCompact(9500, 'EUR', 2, 'fr-FR')).toMatch(/95,00\s€/);
  });

  it('distancia con coma decimal', () => {
    expect(formatKm(1.2, 'es-CO')).toBe('1,2 km');
  });

  it('rango de horas con raya y a. m. / p. m.', () => {
    const text = formatHourRange(
      new Date('2026-11-28T12:00:00Z'), new Date('2026-11-28T20:00:00Z'), 'es-CO', 'America/Bogota', 'h12',
    );
    expect(text).toMatch(/^7:00\sa\.\sm\.\s–\s3:00\sp\.\sm\.$/);
  });

  it('día relativo', () => {
    const now = new Date('2026-11-25T15:00:00Z');
    expect(formatDay(new Date('2026-11-25T20:00:00Z'), 'es-CO', 'America/Bogota', now)).toBe('Hoy');
    expect(formatDay(new Date('2026-11-26T15:00:00Z'), 'es-CO', 'America/Bogota', now)).toBe('Mañana');
    expect(formatDay(new Date('2026-11-28T15:00:00Z'), 'es-CO', 'America/Bogota', now)).toBe('sáb 28 nov');
  });

  it('calificación con una cifra decimal y saludo por hora', () => {
    expect(formatRating(4.85)).toBe('4.8');
    expect(greetingKey(new Date(2026, 10, 25, 11, 59))).toBe('morning');
    expect(greetingKey(new Date(2026, 10, 25, 12, 0))).toBe('afternoon');
    expect(greetingKey(new Date(2026, 10, 25, 18, 0))).toBe('evening');
  });
});
