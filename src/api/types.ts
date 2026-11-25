// Tipos de la API del backend (core: /api/{región}, subsistemas: /subsystems/...).
// Tomados del OpenAPI del core (/api/co/v3/api-docs) y de los controladores de los subsistemas.

export type Role = 'APPLICANT' | 'BUSINESS' | 'WORKER' | 'ADMIN';
export type Verification = 'VERIFIED' | 'PENDING' | 'REJECTED';
export type RequestStatus =
  | 'DRAFT' | 'PENDING_PAYMENT' | 'SEARCHING_WORKER' | 'ASSIGNED' | 'EN_ROUTE' | 'IN_PROGRESS'
  | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'CANCELLED' | 'FAILED' | 'EXPIRED';

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  defaultLocale: string;
  phonePrefix: string;
  documentTypes: string[];
}

export interface AddressField {
  fieldKey: string;
  labelKey: string;
  required: boolean;
  regex: string | null;
  maxLength: number | null;
}

export interface DocumentType {
  code: string;
  kind: 'PERSONAL' | 'TAX';
  validator: string;
  regex: string | null;
}

export interface PaymentMethod {
  code: string;
  labelKey: string;
  flow: 'AUTH_CAPTURE' | 'CHARGE_REFUND' | 'ASYNC_VOUCHER';
}

export interface TaxRule {
  name: string;
  rateBps: number;
  included: boolean;
  source: string;
  validFrom: string;
  reviewStatus: 'VERIFICAR' | 'CONFIRMADO';
}

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface RegionProfile {
  code: string;
  defaultLocale: string;
  supportedLocales: string[];
  currency: string;
  moneyScale: number;
  defaultTimezone: string;
  allowedTimezones: string[];
  expectedGrouping: string;
  expectedDecimal: string;
  symbolPosition: 'BEFORE' | 'AFTER';
  datePattern: string;
  hourCycle: string;
  firstDayOfWeek: Weekday;
  measurementSystem: 'METRIC' | 'US';
  phonePrefix: string;
  postalCodeRegex: string;
  postalLabelKey: string;
  addressSchema: AddressField[];
  nameOrder: 'GIVEN_FAMILY' | 'FAMILY_GIVEN';
  taxRules: TaxRule[];
  pricesIncludeTax: boolean;
  receiptType: string;
  receiptPrefix: string;
  documentTypes: DocumentType[];
  dataProtectionLaw: string;
  termsVersion: string;
  privacyVersion: string;
  paymentMethods: PaymentMethod[];
  tipMode: 'PROMPT' | 'OPTIONAL' | 'HIDDEN';
  tipSuggestedPercents: number[];
  commissionBps: number;
  travelFeeMinor: number;
  reviewStatus: 'VERIFICAR' | 'CONFIRMADO';
  source: string;
  version: number;
  updatedAt: string;
}

export interface Holiday {
  date: string;
  name: string;
  reviewStatus: 'VERIFICAR' | 'CONFIRMADO';
}

export interface User {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  rol: Role;
  verificationState: Verification;
  phone: string | null;
  countryCode: string;
  locale: string | null;
  consentUpToDate: boolean;
}

export interface AddressRequest {
  label?: string;
  fields: Record<string, string>;
}

export interface Address {
  id: string;
  label: string | null;
  countryCode: string;
  fields: Record<string, string>;
  formatted: string;
}

export interface BusinessRequest {
  legalName: string;
  taxIdType: string;
  taxIdNumber: string;
  billingAddress: AddressRequest;
}

export interface Business {
  legalName: string;
  taxIdType: string;
  taxIdNumber: string;
  billingAddress: Address | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  phone?: string;
  rol: Role;
  locale?: string;
  acceptedTerms: boolean;
  address?: AddressRequest;
  business?: BusinessRequest;
}

export interface Price {
  unit: string;
  amountMinor: number;
  currency: string;
  moneyScale: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  price: Price | null;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export interface WorkerProfile {
  userId: string;
  bio: string | null;
  workRadiusKm: number;
  available: boolean;
  ratingAvg: number | null;
  ratingCount: number;
  categories: CategorySummary[];
  baseLatitude: number | null;
  baseLongitude: number | null;
}

export interface PublicWorker {
  userId: string;
  name: string;
  bio: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  categories: CategorySummary[];
}

export interface RequestDraft {
  categoryId: string;
  units: number;
  scheduledLocal: string;
  timezone?: string;
  address: Record<string, string>;
  latitude: number;
  longitude: number;
  paymentMethod: string;
  tipMinor?: number;
  tipPercent?: number;
  notes?: string;
}

export interface RequestLine {
  kind: string;
  description: string;
  quantity: number;
  unitAmountMinor: number;
  amountMinor: number;
  includedInTotal: boolean;
}

export interface Quote {
  categoryId: string;
  categoryName: string;
  unit: string;
  units: number;
  lines: RequestLine[];
  subtotalMinor: number;
  travelFeeMinor: number;
  taxMinor: number;
  taxIncluded: boolean;
  tipMinor: number;
  totalMinor: number;
  currency: string;
  moneyScale: number;
  tipMode: string;
  tipSuggestedPercents: number[];
}

export interface ServiceRequest {
  id: string;
  status: RequestStatus;
  clientId: string;
  workerId: string | null;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  unit: string;
  units: number;
  lines: RequestLine[];
  subtotalMinor: number;
  travelFeeMinor: number;
  taxMinor: number;
  taxIncluded: boolean;
  tipMinor: number;
  totalMinor: number;
  currency: string;
  moneyScale: number;
  paymentMethod: string;
  paymentAttempt: number;
  paymentCaptured: boolean;
  receiptNumber: string | null;
  scheduledAt: string;
  scheduledLocal: string;
  timezone: string;
  addressText: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  from: RequestStatus | null;
  to: RequestStatus;
  at: string;
  actor: string | null;
  reason: string | null;
}

export interface Rating {
  id: string;
  requestId: string;
  direction: string;
  raterId: string;
  rateeId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------- subsistemas

export interface Offer {
  offerId: string;
  requestId: string;
  expiresAt: string;
  distanceKm: number;
  categoryName: string;
  addressText: string;
  scheduledAt: string;
}

export interface Position {
  latitude: number;
  longitude: number;
  at: string;
}

export interface Tracking {
  requestId: string;
  status: string;
  workerId: string | null;
  position: Position | null;
  distanceKm: number | null;
}

export interface InboxItem {
  id: string;
  requestId: string | null;
  template: string;
  title: string;
  body: string;
  locale?: string;
  createdAt: string;
  readAt?: string | null;
  /** Avisos de vacantes: la vacante y la acción del botón (CONFIRM_ATTENDANCE o VIEW_VACANCY). */
  vacancyId?: string | null;
  action?: string | null;
}

export interface ReceiptLine {
  kind: string;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  includedInTotal: boolean;
}

export interface ReceiptView {
  receipt: {
    id: string;
    region: string;
    requestId: string;
    receiptType: string;
    number: string;
    issuerName: string;
    issuerTaxId: string;
    customerName: string;
    customerLegalName: string | null;
    customerTaxIdType: string | null;
    customerTaxIdNumber: string | null;
    currency: string;
    totalMinor: number;
    categoryName: string;
    addressText: string;
  };
  language: string;
  title: string;
  issuedAtText: string;
  lines: ReceiptLine[];
  totals: Record<string, string>;
}

export interface ExchangeRate {
  base: string;
  quote: string;
  rate: number;
  source: string;
  asOf: string;
}

export interface ServiceHealth {
  name: string;
  status: string;
  latencyMs: number | null;
  detail: string | null;
}

export interface QueueInfo {
  name: string;
  messages: number;
  ready: number;
  unacked: number;
  consumers: number;
  noConsumer: boolean;
}

export interface Console {
  dashboard: {
    region: string;
    currency: string;
    timezone: string;
    generatedAt: string;
    requestsByStatus: Record<string, number>;
    today: { since: string; created: number; completed: number; cancelled: number };
    workersAvailable: number;
  };
  down: string[];
  services: ServiceHealth[];
  queues: { available: boolean; deadLetters: number; queues: QueueInfo[] };
}

/** Error del backend (ProblemDetail) con su código estable y los errores por campo. */
export interface Problem {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string>;
}
