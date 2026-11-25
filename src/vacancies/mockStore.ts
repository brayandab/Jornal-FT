/**
 * CAPA SIMULADA de vacantes (el backend aún no tiene vacantes, postulaciones ni selección).
 *
 * Guarda todo en localStorage, por región, y avisa los cambios a las demás pestañas del mismo navegador
 * (evento `storage`). Así la empresa y el trabajador se ven entre sí abriendo dos pestañas normales
 * (cada pestaña tiene su propia sesión). Una ventana de incógnito NO comparte estos datos.
 *
 * Las funciones son asíncronas y devuelven lo mismo que devolverá la API real (docs/pendientes-backend.md),
 * para que el cambio al backend sea reemplazar este archivo por llamadas HTTP.
 */
import type { Category, RegionProfile } from '../api/types';
import { addDays, endsAt, haversineKm, matchFor, round1, viability } from './logic';
import type {
  Applicant, Application, Employer, LatLng, NearbyVacancy, NoticeKind, Payout, Vacancy, VacancyDraft, VacancyNotice,
} from './types';

export interface WorkerExtra {
  experience: string;
  skills: string[];
  /** Foto en data URL (se reduce antes de guardar). */
  photo?: string;
  documents: { name: string; size: number; uploadedAt: string }[];
}

interface Db {
  version: 1;
  seeded: boolean;
  vacancies: Vacancy[];
  notices: VacancyNotice[];
  extras: Record<string, WorkerExtra>;
}

const KEY = (region: string) => `trabajoya.mock.vacantes.${region}`;
const listeners = new Set<() => void>();
let region = 'co';

export function setStoreRegion(r: string) {
  region = r;
}

function load(): Db {
  try {
    const raw = localStorage.getItem(KEY(region));
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // sin almacenamiento
  }
  return { version: 1, seeded: false, vacancies: [], notices: [], extras: {} };
}

function save(db: Db) {
  try {
    localStorage.setItem(KEY(region), JSON.stringify(db));
  } catch {
    // almacenamiento lleno (por ejemplo, fotos grandes): se ignora
  }
  listeners.forEach((l) => l());
}

/** Suscripción a cambios (de esta pestaña o de otra). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY(region)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const wait = <T>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));

function notify(db: Db, userId: string, vacancyId: string, kind: NoticeKind, data: VacancyNotice['data']) {
  db.notices.unshift({ id: id(), userId, vacancyId, kind, createdAt: now(), read: false, data });
}

function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const db = load();
  const result = fn(db);
  save(db);
  return wait(result);
}

function find(db: Db, vacancyId: string): Vacancy {
  const v = db.vacancies.find((x) => x.id === vacancyId);
  if (!v) throw Object.assign(new Error('VACANCY_NOT_FOUND'), { code: 'VACANCY_NOT_FOUND' });
  return v;
}

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

// ------------------------------------------------------------------ datos de ejemplo

const EMPLOYERS: Employer[] = [
  { id: 'demo-emp-1', name: 'Logística Andina SAS', legalName: 'Logística Andina SAS', kind: 'BUSINESS', ratingAvg: 4.8, ratingCount: 214, verified: true },
  { id: 'demo-emp-2', name: 'Bodegas del Occidente', legalName: 'Bodegas del Occidente Ltda', kind: 'BUSINESS', ratingAvg: 4.6, ratingCount: 87, verified: true },
  { id: 'demo-emp-3', name: 'Marta Gómez', kind: 'PERSON', ratingAvg: 4.9, ratingCount: 12, verified: false },
];

const SIM_NAMES = ['Andrés Ruiz', 'Paola Méndez', 'Jhon Castaño', 'Lina Torres', 'Camilo Rojas', 'Sara Pineda'];

function offset(from: LatLng, km: number, bearingDeg: number): LatLng {
  const b = (bearingDeg * Math.PI) / 180;
  return {
    lat: from.lat + (km * Math.cos(b)) / 111.32,
    lng: from.lng + (km * Math.sin(b)) / (111.32 * Math.cos((from.lat * Math.PI) / 180)),
  };
}

function today(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Vacantes ficticias de otras empresas para que el trabajador vea ofertas aunque nadie haya publicado. */
export async function seedIfNeeded(center: LatLng, categories: Category[], profile: RegionProfile, city: string) {
  const db = load();
  if (db.seeded || categories.length === 0) return;
  const priced = categories.filter((c) => c.price && c.price.unit === 'DAY');
  const pick = (slug: string) => priced.find((c) => c.slug === slug) ?? priced[0] ?? categories[0];
  const base = today(profile.defaultTimezone);
  const specs = [
    { slug: 'warehouse', title: 'Auxiliar de bodega para inventario', days: 3, workers: 2, km: 1.2, deg: 40, place: 'Bodega Zona Industrial', startIn: 1, urgent: true, emp: 0 },
    { slug: 'moving', title: 'Cotero para cargue y descargue', days: 1, workers: 3, km: 2.4, deg: 160, place: 'Centro de distribución Sur', startIn: 1, urgent: false, emp: 1 },
    { slug: 'cleaning', title: 'Aseo general de apartamento', days: 1, workers: 1, km: 0.8, deg: 280, place: 'Conjunto residencial Los Pinos', startIn: 2, urgent: false, emp: 2 },
    { slug: 'events', title: 'Apoyo logístico para evento', days: 2, workers: 4, km: 5.5, deg: 90, place: 'Centro de eventos del Norte', startIn: 4, urgent: false, emp: 0 },
    { slug: 'construction', title: 'Ayudante de obra por una semana', days: 7, workers: 2, km: 3.6, deg: 220, place: 'Obra Torre 2', startIn: 3, urgent: false, emp: 1 },
  ];
  for (const s of specs) {
    const c = pick(s.slug);
    const p = offset(center, s.km, s.deg);
    db.vacancies.push({
      id: id(), region, employer: EMPLOYERS[s.emp], categoryId: c.id, categoryName: c.name, title: s.title,
      description: 'Trabajo temporal sin contrato. Se requiere puntualidad y buena actitud; el pago se hace al terminar lo acordado.',
      requirements: ['Documento de identidad', 'Puntualidad', 'Ropa cómoda o de trabajo'],
      workersNeeded: s.workers, startDate: addDays(base, s.startIn), days: s.days, startTime: '07:00', endTime: '15:00',
      timezone: profile.defaultTimezone, address: {}, addressText: city ? `${s.place}, ${city}` : s.place, latitude: p.lat, longitude: p.lng,
      payPerDayMinor: c.price?.amountMinor ?? 0, currency: profile.currency, moneyScale: profile.moneyScale,
      commissionBps: profile.commissionBps ?? 1000, urgent: s.urgent, status: 'OPEN', createdAt: now(), applications: [],
    });
  }
  db.seeded = true;
  save(db);
}

function simulatedApplicants(v: Vacancy, count: number): Application[] {
  return Array.from({ length: count }, (_, i) => {
    const distanceKm = round1(0.6 + i * 1.7 + Math.random());
    const worker: Applicant = {
      workerId: `sim-${id()}`, name: SIM_NAMES[(i + v.title.length) % SIM_NAMES.length],
      ratingAvg: round1(4 + Math.random()), ratingCount: 3 + Math.floor(Math.random() * 40),
      completedJobs: Math.floor(Math.random() * 30), bio: 'Trabajador de demostración (postulante simulado).',
      experience: `${1 + i} años en trabajos similares`, skills: ['Trabajo en equipo', 'Puntualidad'],
      categoryIds: i % 3 === 2 ? [] : [v.categoryId], simulated: true,
    };
    return {
      id: id(), vacancyId: v.id, worker, status: 'APPLIED' as const,
      appliedAt: new Date(Date.now() - (count - i) * 60_000).toISOString(),
      distanceKm, viability: viability(worker, distanceKm, v.categoryId),
    };
  });
}

// ------------------------------------------------------------------ API simulada

export const vacancyApi = {
  // ---------------- empresa o persona que contrata
  create(employer: Employer, draft: VacancyDraft, profile: RegionProfile): Promise<Vacancy> {
    return mutate((db) => {
      const v: Vacancy = {
        ...draft, id: id(), region, employer, currency: profile.currency, moneyScale: profile.moneyScale,
        commissionBps: profile.commissionBps ?? 1000, status: 'OPEN', createdAt: now(), applications: [],
      };
      // Postulantes simulados para poder demostrar la selección sin otra sesión abierta.
      v.applications = simulatedApplicants(v, Math.min(3, v.workersNeeded + 2));
      db.vacancies.unshift(v);
      return v;
    });
  },

  mine(employerId: string): Promise<Vacancy[]> {
    return wait(load().vacancies.filter((v) => v.employer.id === employerId));
  },

  get(vacancyId: string): Promise<Vacancy> {
    return wait(find(load(), vacancyId));
  },

  /** Selecciona a los trabajadores: la vacante pasa a "en proceso" y se avisa a cada postulante. */
  select(vacancyId: string, workerIds: string[]): Promise<Vacancy> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      if (v.status !== 'OPEN') fail('VACANCY_NOT_OPEN');
      if (workerIds.length === 0 || workerIds.length > v.workersNeeded) fail('INVALID_SELECTION');
      for (const a of v.applications) {
        if (a.status === 'WITHDRAWN') continue;
        a.status = workerIds.includes(a.worker.workerId) ? 'SELECTED' : 'NOT_SELECTED';
        if (!a.worker.simulated) {
          notify(db, a.worker.workerId, v.id, a.status === 'SELECTED' ? 'SELECTED' : 'NOT_SELECTED', {
            title: v.title, date: v.startDate, time: v.startTime, address: v.addressText, employer: v.employer.name,
          });
        }
      }
      v.status = 'IN_PROCESS';
      v.selectedAt = now();
      return v;
    });
  },

  cancel(vacancyId: string, reason: string): Promise<Vacancy> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      if (v.status === 'COMPLETED' || v.status === 'CANCELLED') fail('VACANCY_CLOSED');
      v.status = 'CANCELLED';
      v.cancelReason = reason;
      v.finishedAt = now();
      for (const a of v.applications) {
        if (!a.worker.simulated && a.status !== 'WITHDRAWN') {
          notify(db, a.worker.workerId, v.id, 'CANCELLED', { title: v.title, reason });
        }
      }
      return v;
    });
  },

  /** Paga a cada trabajador con el método elegido; la empresa paga además la comisión de la app. */
  finalize(vacancyId: string, payouts: Payout[]): Promise<Vacancy> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      if (v.status !== 'IN_PROCESS') fail('VACANCY_NOT_IN_PROCESS');
      if (!v.demoEnded && new Date() < endsAt(v)) fail('VACANCY_NOT_FINISHED');
      v.status = 'COMPLETED';
      v.payouts = payouts;
      v.finishedAt = now();
      for (const p of payouts) {
        if (!p.workerId.startsWith('sim-')) {
          notify(db, p.workerId, v.id, 'PAID', { title: v.title, amount: p.amountMinor, method: p.method });
        }
      }
      return v;
    });
  },

  /** Solo demostración: habilita Finalizar sin esperar a que termine la última jornada. */
  demoEnd(vacancyId: string): Promise<Vacancy> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      v.demoEnded = true;
      return v;
    });
  },

  // ---------------- trabajador
  nearby(workerId: string, base: LatLng, radiusKm: number, categoryIds: string[]): Promise<NearbyVacancy[]> {
    const list = load()
      .vacancies.filter((v) => v.status === 'OPEN' && v.employer.id !== workerId)
      .map((v) => {
        const distanceKm = round1(haversineKm(base, { lat: v.latitude, lng: v.longitude }));
        return {
          vacancy: v, distanceKm, match: matchFor(distanceKm, radiusKm, categoryIds.includes(v.categoryId)),
          mine: v.applications.find((a) => a.worker.workerId === workerId),
        };
      })
      .filter((x) => x.distanceKm <= radiusKm)
      .sort((a, b) => b.match - a.match);
    return wait(list);
  },

  apply(vacancyId: string, applicant: Applicant, distanceKm: number): Promise<Application> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      if (v.status !== 'OPEN') fail('VACANCY_NOT_OPEN');
      const existing = v.applications.find((a) => a.worker.workerId === applicant.workerId);
      if (existing && existing.status !== 'WITHDRAWN') fail('ALREADY_APPLIED');
      const a: Application = {
        id: existing?.id ?? id(), vacancyId, worker: applicant, status: 'APPLIED', appliedAt: now(), distanceKm,
        viability: viability(applicant, distanceKm, v.categoryId),
      };
      v.applications = [...v.applications.filter((x) => x.id !== a.id), a];
      notify(db, v.employer.id, v.id, 'NEW_APPLICANT', { title: v.title, name: applicant.name });
      return a;
    });
  },

  withdraw(vacancyId: string, workerId: string): Promise<void> {
    return mutate((db) => {
      const v = find(db, vacancyId);
      const a = v.applications.find((x) => x.worker.workerId === workerId);
      if (!a || a.status !== 'APPLIED') fail('CANNOT_WITHDRAW');
      a.status = 'WITHDRAWN';
    });
  },

  /** Postulaciones del trabajador con su vacante (todas las etapas). */
  myApplications(workerId: string): Promise<{ vacancy: Vacancy; application: Application }[]> {
    const out = load().vacancies.flatMap((v) =>
      v.applications.filter((a) => a.worker.workerId === workerId).map((application) => ({ vacancy: v, application })),
    );
    out.sort((a, b) => b.application.appliedAt.localeCompare(a.application.appliedAt));
    return wait(out);
  },

  /** Trabajos terminados y pagados del trabajador. */
  workerStats(workerId: string): Promise<{ completed: number; earnedMinor: number; weekMinor: number }> {
    const weekAgo = Date.now() - 7 * 86_400_000;
    let completed = 0;
    let earnedMinor = 0;
    let weekMinor = 0;
    for (const v of load().vacancies) {
      const p = v.payouts?.find((x) => x.workerId === workerId);
      if (v.status !== 'COMPLETED' || !p) continue;
      completed++;
      earnedMinor += p.amountMinor;
      if (v.finishedAt && Date.parse(v.finishedAt) >= weekAgo) weekMinor += p.amountMinor;
    }
    return wait({ completed, earnedMinor, weekMinor });
  },

  getExtra(workerId: string): Promise<WorkerExtra> {
    return wait(load().extras[workerId] ?? { experience: '', skills: [], documents: [] });
  },

  saveExtra(workerId: string, extra: WorkerExtra): Promise<WorkerExtra> {
    return mutate((db) => {
      db.extras[workerId] = extra;
      return extra;
    });
  },

  // ---------------- avisos del flujo de vacantes
  notices(userId: string): Promise<VacancyNotice[]> {
    return wait(load().notices.filter((n) => n.userId === userId));
  },

  markRead(noticeId: string): Promise<void> {
    return mutate((db) => {
      const n = db.notices.find((x) => x.id === noticeId);
      if (n) n.read = true;
    });
  },
};
