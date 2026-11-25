import { describe, expect, it } from 'vitest';
import { formatInstant, formatLocal, formatMoney, toMinor } from './format';

describe('formatMoney', () => {
  it('usa la escala del país y no la de ISO (COP sin decimales)', () => {
    expect(formatMoney(150000, { currency: 'COP', moneyScale: 0 }, 'es-CO')).toMatch(/150\.000/);
  });

  it('en francés separa miles con espacio fino (U+202F)', () => {
    expect(formatMoney(123456, { currency: 'EUR', moneyScale: 2 }, 'fr-FR')).toContain('1 234,56');
  });

  it('yenes sin decimales', () => {
    expect(formatMoney(12000, { currency: 'JPY', moneyScale: 0 }, 'ja-JP')).toMatch(/12,000/);
  });

  it('convierte a unidades menores sin errores de coma flotante', () => {
    expect(toMinor(19.99, 2)).toBe(1999);
  });
});

describe('fechas', () => {
  it('muestra el instante en la zona del lugar del pedido', () => {
    // 2026-11-16T01:30Z es el 15/11 a las 8:30 p. m. en Bogotá (cruza la medianoche en UTC)
    const text = formatInstant('2026-11-16T01:30:00Z', 'es-CO', 'America/Bogota', 'h12');
    expect(text).toContain('15/11');
    expect(text).toMatch(/8:30/);
  });

  it('respeta la hora local guardada sin moverla de zona', () => {
    expect(formatLocal('2026-11-15T20:30', 'ja-JP', 'h23')).toContain('20:30');
  });
});
