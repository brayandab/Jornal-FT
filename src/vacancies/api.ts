/**
 * Vacantes contra el backend (core regional, /api/{país}/vacancies). Traduce las respuestas a la forma de
 * types.ts: el backend guarda inicio y fin como instantes UTC con la zona del lugar; aquí se derivan el primer
 * día, el número de días, el horario de cada jornada y el pago por jornada.
 */
import { core } from '../api/client';
import { api } from '../api/endpoints';
import type { Page } from '../api/types';
import { addDays } from './logic';
import { emitVacancyChange } from './events';
import type {
  Application, ApplicationStatus, CloseReason, PayoutStatus, Vacancy, VacancyDraft, VacancyStatus,
} from './types';

interface VacancyDto {
  id: string; employerId: string; employerName: string | null; title: string; description: string;
  categoryId: string | null; items: string[]; addressText: string; latitude: number; longitude: number;
  timezone: string; startsAt: string; endsAt: string; positions: number; filledPositions: number;
  payMinor: number; currency: string; moneyScale: number; status: VacancyStatus; distanceKm: number | null;
  myApplication: ApplicationStatus | null; applicants: number | null; createdAt: string;
  sourceLanguage: string | null; translated: boolean;
}

interface ApplicationDto {
  id: string; vacancyId: string; vacancyTitle: string; workerId: string; workerName: string | null;
  workerVerified: boolean; ratingAvg: number; ratingCount: number; completedJobs: number; distanceKm: number | null;
  score: number; status: ApplicationStatus; message: string | null; closeReason: CloseReason | null;
  justification: string | null; payoutMinor: number | null; currency: string; moneyScale: number;
  payoutStatus: PayoutStatus | null; payoutMode: 'AUTO' | 'MANUAL' | null; paidAmountMinor: number | null;
  paymentNote: string | null; payoutRef: string | null; payoutFailure: string | null; paidAt: string | null;
  startsAt: string; endsAt: string; createdAt: string;
}

// ------------------------------------------------------------------ conversión

/** Fecha y hora locales de un instante en una zona IANA. */
function local(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

let categoryNames: Promise<Map<string, string>> | null = null;
function categoryName(id: string | null): Promise<string> {
  categoryNames ??= api.categories().then((cs) => new Map(cs.map((c) => [c.id, c.name]))).catch(() => new Map());
  return categoryNames.then((m) => (id ? m.get(id) ?? '' : ''));
}

/** Al cambiar de idioma se vuelven a pedir los nombres de las categorías. */
export function resetVacancyCaches() {
  categoryNames = null;
}

async function toVacancy(d: VacancyDto): Promise<Vacancy> {
  const start = local(d.startsAt, d.timezone);
  const end = local(d.endsAt, d.timezone);
  const days = Math.max(1, daysBetween(start.date, end.date) + 1);
  return {
    id: d.id, employer: { id: d.employerId, name: d.employerName ?? '' }, categoryId: d.categoryId,
    categoryName: await categoryName(d.categoryId), title: d.title, description: d.description, requirements: d.items,
    workersNeeded: d.positions, filled: d.filledPositions, startDate: start.date, days, startTime: start.time,
    endTime: end.time, timezone: d.timezone, startsAt: d.startsAt, endsAt: d.endsAt, addressText: d.addressText,
    latitude: d.latitude, longitude: d.longitude, payPerDayMinor: Math.round(d.payMinor / days), payMinor: d.payMinor,
    currency: d.currency, moneyScale: d.moneyScale, status: d.status, createdAt: d.createdAt, distanceKm: d.distanceKm,
    myApplication: d.myApplication, applicantsCount: d.applicants, sourceLanguage: d.sourceLanguage,
    translated: d.translated,
  };
}

const opt = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function toApplication(d: ApplicationDto): Application {
  return {
    id: d.id, vacancyId: d.vacancyId, vacancyTitle: d.vacancyTitle,
    worker: {
      workerId: d.workerId, name: d.workerName ?? '', verified: d.workerVerified, ratingAvg: Number(d.ratingAvg ?? 0),
      ratingCount: d.ratingCount, completedJobs: d.completedJobs,
    },
    status: d.status, message: opt(d.message), appliedAt: d.createdAt, distanceKm: d.distanceKm, viability: Math.round(d.score),
    closeReason: opt(d.closeReason), justification: opt(d.justification), payoutMinor: opt(d.payoutMinor),
    paidAmountMinor: opt(d.paidAmountMinor), payoutStatus: opt(d.payoutStatus), payoutMode: opt(d.payoutMode),
    paymentNote: opt(d.paymentNote), payoutRef: opt(d.payoutRef), payoutFailure: opt(d.payoutFailure), paidAt: opt(d.paidAt),
    currency: d.currency, moneyScale: d.moneyScale, startsAt: d.startsAt, endsAt: d.endsAt,
  };
}

const toVacancies = (p: Page<VacancyDto>) => Promise.all(p.items.map(toVacancy));

/** Ejecuta un cambio y avisa a las pantallas abiertas para que recarguen. */
async function change<T>(p: Promise<T>): Promise<T> {
  const r = await p;
  emitVacancyChange();
  return r;
}

// ------------------------------------------------------------------ API

export const vacancyApi = {
  // ---------------- quien contrata
  create: (draft: VacancyDraft) =>
    change(core<VacancyDto>('/vacancies', {
      body: {
        title: draft.title, description: draft.description, categoryId: draft.categoryId || undefined,
        items: draft.requirements, startLocal: `${draft.startDate}T${draft.startTime}`,
        endLocal: `${addDays(draft.startDate, draft.days - 1)}T${draft.endTime}`, timezone: draft.timezone,
        positions: draft.workersNeeded, payMinor: draft.payPerDayMinor * draft.days, address: draft.address,
        latitude: draft.latitude, longitude: draft.longitude,
      },
    }).then(toVacancy)),

  /** Todas mis vacantes (hasta 100), o solo las terminadas con personas por cerrar. */
  mine: (pendingClosure = false) =>
    core<Page<VacancyDto>>(`/vacancies/mine?size=100${pendingClosure ? '&pendingClosure=true' : ''}`).then(toVacancies),

  get: (id: string) => core<VacancyDto>(`/vacancies/${id}`).then(toVacancy),

  /** Postulados ordenados por viabilidad (el mejor primero). */
  applications: (id: string) =>
    core<ApplicationDto[]>(`/vacancies/${id}/applications`).then((l) => l.map(toApplication)),

  select: (id: string, applicationIds: string[]) =>
    change(core<ApplicationDto[]>(`/vacancies/${id}/selections`, { body: { applicationIds } })),

  /** Botón «Finalizar»: la persona terminó; pasa a pago (automático si está activo en Configuración). */
  complete: (id: string, applicationId: string) =>
    change(core<ApplicationDto>(`/vacancies/${id}/applications/${applicationId}/complete`, { body: {} }).then(toApplication)),

  /** Botón «Cancelar»: no fue o dejó el trabajo a medias; sin pago y con justificación. */
  cancelWork: (id: string, applicationId: string, reason: CloseReason, justification: string) =>
    change(core<ApplicationDto>(`/vacancies/${id}/applications/${applicationId}/cancel`, { body: { reason, justification } })
      .then(toApplication)),

  /** Pago a mano; si es menos de lo acordado, la justificación es obligatoria. */
  pay: (id: string, applicationId: string, amountMinor: number, justification?: string) =>
    change(core<ApplicationDto>(`/vacancies/${id}/applications/${applicationId}/paid`, {
      body: { amountMinor, justification: justification || undefined },
    }).then(toApplication)),

  cancelVacancy: (id: string) => change(core<VacancyDto>(`/vacancies/${id}/cancel`, { body: {} })),

  payouts: (status?: PayoutStatus) =>
    core<Page<ApplicationDto>>(`/vacancies/payouts?size=100${status ? `&status=${status}` : ''}`)
      .then((p) => p.items.map(toApplication)),

  settings: () => core<{ autoPayout: boolean }>('/vacancies/settings'),
  saveSettings: (autoPayout: boolean) =>
    core<{ autoPayout: boolean }>('/vacancies/settings', { method: 'PUT', body: { autoPayout } }),

  // ---------------- trabajador
  /** Vacantes abiertas (sin empezar), con la distancia desde la ubicación base del trabajador. */
  open: (maxDistanceKm?: number) =>
    core<Page<VacancyDto>>(`/vacancies?size=100${maxDistanceKm ? `&maxDistanceKm=${maxDistanceKm}` : ''}`).then(toVacancies),

  apply: (id: string, message?: string) =>
    change(core<ApplicationDto>(`/vacancies/${id}/apply`, { body: { message } }).then(toApplication)),

  withdraw: (id: string) => change(core<ApplicationDto>(`/vacancies/${id}/withdraw`, { body: {} })),

  /** Botón del aviso «¿Puedes asistir?». */
  attendance: (id: string, attending: boolean) =>
    change(core<ApplicationDto>(`/vacancies/${id}/attendance`, { body: { attending } }).then(toApplication)),

  myApplications: () =>
    core<Page<ApplicationDto>>('/vacancies/applications/mine?size=100').then((p) => p.items.map(toApplication)),
};
