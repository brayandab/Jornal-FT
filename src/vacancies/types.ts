// Vacantes de trabajo temporal (informal, sin contrato: de 1 a 7 días).
// Hoy los sirve una capa simulada en el navegador (src/vacancies/mockStore.ts); estos tipos son el contrato
// que debe implementar el backend (ver docs/pendientes-backend.md).

export interface LatLng { lat: number; lng: number }

export type VacancyStatus =
  | 'OPEN'        // publicada, recibiendo postulaciones
  | 'IN_PROCESS'  // la empresa ya seleccionó; los trabajadores van o están trabajando
  | 'COMPLETED'   // finalizada y pagada
  | 'CANCELLED';  // cancelada (no asistieron, no terminaron u otro motivo)

export type ApplicationStatus = 'APPLIED' | 'SELECTED' | 'NOT_SELECTED' | 'WITHDRAWN';

export interface Applicant {
  workerId: string;
  name: string;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  bio: string;
  experience: string;
  skills: string[];
  categoryIds: string[];
  phone?: string;
  /** Postulante ficticio para demostrar la selección sin otra sesión abierta. */
  simulated: boolean;
}

export interface Application {
  id: string;
  vacancyId: string;
  worker: Applicant;
  status: ApplicationStatus;
  appliedAt: string;
  distanceKm: number;
  /** 0 a 100: cercanía, calificación, experiencia y categoría. */
  viability: number;
}

export interface Employer {
  id: string;
  name: string;
  legalName?: string;
  kind: 'PERSON' | 'BUSINESS';
  ratingAvg: number;
  ratingCount: number;
  verified: boolean;
}

export interface Payout {
  workerId: string;
  name: string;
  method: string;
  amountMinor: number;
}

export interface Vacancy {
  id: string;
  region: string;
  employer: Employer;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  requirements: string[];
  workersNeeded: number;
  /** Primer día (fecha local del lugar) y número de días (1 a 7). */
  startDate: string;
  days: number;
  /** Horario de cada jornada, hora local del lugar. */
  startTime: string;
  endTime: string;
  timezone: string;
  address: Record<string, string>;
  addressText: string;
  latitude: number;
  longitude: number;
  payPerDayMinor: number;
  currency: string;
  moneyScale: number;
  /** Comisión de la app sobre lo que se paga a los trabajadores (puntos básicos), la paga la empresa. */
  commissionBps: number;
  urgent: boolean;
  status: VacancyStatus;
  createdAt: string;
  selectedAt?: string;
  finishedAt?: string;
  cancelReason?: string;
  applications: Application[];
  payouts?: Payout[];
  /** Solo demostración: permite finalizar antes de que termine la última jornada. */
  demoEnded?: boolean;
}

export interface VacancyDraft {
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  requirements: string[];
  workersNeeded: number;
  startDate: string;
  days: number;
  startTime: string;
  endTime: string;
  timezone: string;
  address: Record<string, string>;
  addressText: string;
  latitude: number;
  longitude: number;
  payPerDayMinor: number;
  urgent: boolean;
}

export type NoticeKind = 'SELECTED' | 'NOT_SELECTED' | 'CANCELLED' | 'PAID' | 'NEW_APPLICANT' | 'NEARBY';

export interface VacancyNotice {
  id: string;
  userId: string;
  vacancyId: string;
  kind: NoticeKind;
  createdAt: string;
  read: boolean;
  /** Datos para armar el texto en el idioma de quien lo lee. */
  data: Record<string, string | number>;
}

/** Vacante vista por un trabajador: distancia a su ubicación base y su postulación, si existe. */
export interface NearbyVacancy {
  vacancy: Vacancy;
  distanceKm: number;
  match: number;
  mine?: Application;
}
