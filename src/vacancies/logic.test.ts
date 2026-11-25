import { describe, expect, it } from 'vitest';
import { addDays, hasEnded, hasStarted, haversineKm, lastDay, matchFor } from './logic';

describe('reglas de vacantes', () => {
  it('fechas locales', () => {
    expect(addDays('2026-11-30', 3)).toBe('2026-12-03');
    expect(lastDay({ startDate: '2026-11-28', days: 3 })).toBe('2026-11-30');
  });

  it('inicio y fin según los instantes del backend', () => {
    const v = { startsAt: '2026-11-28T12:00:00Z', endsAt: '2026-11-28T20:00:00Z' };
    expect(hasStarted(v, new Date('2026-11-28T11:59:00Z'))).toBe(false);
    expect(hasStarted(v, new Date('2026-11-28T12:00:00Z'))).toBe(true);
    expect(hasEnded(v, new Date('2026-11-28T19:59:00Z'))).toBe(false);
    expect(hasEnded(v, new Date('2026-11-28T20:00:00Z'))).toBe(true);
  });

  it('distancia y compatibilidad', () => {
    expect(haversineKm({ lat: 4.6584, lng: -74.0937 }, { lat: 4.6674, lng: -74.0937 })).toBeCloseTo(1.0, 1);
    expect(matchFor(0, 10, true)).toBe(100);
    expect(matchFor(10, 10, false)).toBe(12);
  });
});
