import { describe, expect, it } from 'vitest';
import { addDays, canFinalize, employerCost, endsAt, haversineKm, viability, zonedInstant } from './logic';
import type { Applicant, Vacancy } from './types';

const applicant: Applicant = {
  workerId: 'w', name: 'Ana', ratingAvg: 5, ratingCount: 10, completedJobs: 20, bio: '', experience: '', skills: [],
  categoryIds: ['bodega'], simulated: false,
};

describe('reglas de vacantes', () => {
  it('costo para la empresa: trabajadores × días × pago + comisión', () => {
    expect(employerCost({ payPerDayMinor: 85000, days: 3, commissionBps: 1000 }, 2)).toEqual({
      toWorkers: 510000, commission: 51000, total: 561000,
    });
  });

  it('fechas locales en la zona del lugar', () => {
    expect(addDays('2026-11-30', 3)).toBe('2026-12-03');
    expect(zonedInstant('2026-11-28', '07:00', 'America/Bogota').toISOString()).toBe('2026-11-28T12:00:00.000Z');
    expect(zonedInstant('2026-11-28', '07:00', 'Asia/Tokyo').toISOString()).toBe('2026-11-27T22:00:00.000Z');
    expect(endsAt({ startDate: '2026-11-28', days: 3, endTime: '15:00', timezone: 'America/Bogota' }).toISOString())
      .toBe('2026-11-30T20:00:00.000Z');
  });

  it('finalizar solo después de la última jornada', () => {
    const v = { status: 'IN_PROCESS', startDate: '2026-11-28', days: 1, endTime: '15:00', timezone: 'America/Bogota' } as Vacancy;
    expect(canFinalize(v, new Date('2026-11-28T19:59:00Z'))).toBe(false);
    expect(canFinalize(v, new Date('2026-11-28T20:00:00Z'))).toBe(true);
    expect(canFinalize({ ...v, status: 'OPEN' }, new Date('2026-12-01T00:00:00Z'))).toBe(false);
  });

  it('distancia y viabilidad', () => {
    expect(haversineKm({ lat: 4.6584, lng: -74.0937 }, { lat: 4.6674, lng: -74.0937 })).toBeCloseTo(1.0, 1);
    expect(viability(applicant, 0, 'bodega')).toBe(100);
    expect(viability(applicant, 0, 'otra')).toBe(80);
    expect(viability({ ...applicant, completedJobs: 0, ratingCount: 0 }, 10, 'bodega')).toBeLessThan(60);
  });
});
