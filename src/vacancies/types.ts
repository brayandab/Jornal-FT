// Vacantes de trabajo temporal (informal, sin contrato: de 1 a 7 días).
// Los sirve el backend (módulo vacancies del core regional, /api/{país}/vacancies). La capa vacancies/api.ts
// traduce sus respuestas a esta forma: fechas y horario locales del lugar, pago por jornada y por persona.

export interface LatLng { lat: number; lng: number }

/** OPEN: recibe postulaciones. FILLED: cupos completos. CLOSED: todos cerrados tras el trabajo. CANCELLED: retirada. */
export type VacancyStatus = 'OPEN' | 'FILLED' | 'CLOSED' | 'CANCELLED';

/**
 * APPLIED → SELECTED (contratado, debe confirmar asistencia) → CONFIRMED → COMPLETED (pasa a pago) o CANCELLED
 * (no fue o dejó el trabajo; sin pago). DECLINED: dijo que no puede. WITHDRAWN: se retiró. NOT_SELECTED: no elegido.
 */
export type ApplicationStatus =
  | 'APPLIED' | 'SELECTED' | 'CONFIRMED' | 'DECLINED' | 'WITHDRAWN' | 'NOT_SELECTED' | 'COMPLETED' | 'CANCELLED';

export type CloseReason = 'NO_SHOW' | 'ABANDONED' | 'OTHER';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
export type PayoutMode = 'AUTO' | 'MANUAL';

export interface Applicant {
  workerId: string;
  name: string;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
}

export interface Application {
  id: string;
  vacancyId: string;
  vacancyTitle: string;
  worker: Applicant;
  status: ApplicationStatus;
  message?: string;
  appliedAt: string;
  distanceKm: number | null;
  /** 0 a 100, lo calcula el backend: calificación, trabajos finalizados, cercanía y verificación. */
  viability: number;
  closeReason?: CloseReason;
  justification?: string;
  /** Lo acordado (pago de la vacante por persona) y lo que realmente se pagó. */
  payoutMinor?: number;
  paidAmountMinor?: number;
  payoutStatus?: PayoutStatus;
  payoutMode?: PayoutMode;
  paymentNote?: string;
  payoutRef?: string;
  payoutFailure?: string;
  paidAt?: string;
  currency: string;
  moneyScale: number;
  startsAt: string;
  endsAt: string;
}

export interface Employer {
  id: string;
  name: string;
}

export interface Vacancy {
  id: string;
  employer: Employer;
  categoryId: string | null;
  categoryName: string;
  title: string;
  description: string;
  /** Implementos que debe llevar el trabajador. */
  requirements: string[];
  workersNeeded: number;
  /** Personas contratadas que ocupan cupo (por confirmar, confirmadas o finalizadas). */
  filled: number;
  /** Primer día (fecha local del lugar) y número de días (1 a 7). */
  startDate: string;
  days: number;
  /** Horario de cada jornada, hora local del lugar. */
  startTime: string;
  endTime: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  addressText: string;
  latitude: number;
  longitude: number;
  payPerDayMinor: number;
  /** Pago total por persona (lo que se le paga al finalizar). */
  payMinor: number;
  currency: string;
  moneyScale: number;
  status: VacancyStatus;
  createdAt: string;
  /** Solo para el trabajador que consulta. */
  distanceKm: number | null;
  myApplication: ApplicationStatus | null;
  /** Solo para el dueño: número de postulaciones. */
  applicantsCount: number | null;
  /** Idioma en que se escribió (es, en...) y si el contenido se tradujo automáticamente al idioma actual. */
  sourceLanguage: string | null;
  translated: boolean;
}

export interface VacancyDraft {
  categoryId: string;
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
  latitude: number;
  longitude: number;
  payPerDayMinor: number;
}

/** Vacante vista por un trabajador: distancia a su ubicación base y compatibilidad. */
export interface NearbyVacancy {
  vacancy: Vacancy;
  distanceKm: number;
  match: number;
}
