import { core, coreOf, sub, uuid } from './client';
import type {
  Address, AddressRequest, AdminCategory, Business, BusinessRequest, Category, Console, Country,
  ExchangeRate, HistoryEntry, Holiday, InboxItem, Offer, Page, PublicWorker, Quote, Rating,
  RegionProfile, RegisterRequest, RequestDraft, RequestStatus, ReceiptView, Role, ServiceRequest,
  TokenResponse, Tracking, User, Verification, WorkerProfile,
} from './types';

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

// Regiones que el gateway enruta (Alemania entró solo con datos, como sexto país).
export const REGIONS = ['co', 'br', 'us', 'fr', 'jp', 'de'] as const;

export const api = {
  // ---------------------------------------------------------- región y país
  countries: async (): Promise<Country[]> => {
    // Cualquier core responde la lista de países; si una región está caída se prueba la siguiente.
    for (const r of REGIONS) {
      try {
        return await coreOf<Country[]>(r, '/countries', { anonymous: true });
      } catch {
        // siguiente región
      }
    }
    return [];
  },
  regionProfile: (region: string) => coreOf<RegionProfile>(region, '/region-profile', { anonymous: true }),
  holidays: () => core<Holiday[]>('/region-profile/holidays', { anonymous: true }),

  // ---------------------------------------------------------- identidad
  login: (email: string, password: string) =>
    core<TokenResponse>('/auth/login', { body: { email, password }, anonymous: true }),
  register: (body: RegisterRequest) => core<User>('/auth/register', { body, anonymous: true }),
  logout: (refreshToken: string) => core<void>('/auth/logout', { body: { refreshToken } }),
  me: () => core<User>('/users/me'),
  updateMe: (body: Partial<Pick<User, 'givenName' | 'familyName' | 'phone' | 'locale'>>) =>
    core<User>('/users/me', { method: 'PATCH', body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    core<void>('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
  addresses: () => core<Address[]>('/users/me/addresses'),
  addAddress: (body: AddressRequest) => core<Address>('/users/me/addresses', { body }),
  deleteAddress: (id: string) => core<void>(`/users/me/addresses/${id}`, { method: 'DELETE' }),
  business: () => core<Business>('/users/me/business'),
  saveBusiness: (body: BusinessRequest) => core<Business>('/users/me/business', { method: 'PUT', body }),

  // ---------------------------------------------------------- catálogo y pedidos
  categories: (q?: string) => core<Category[]>(`/categories${qs({ q })}`),
  quote: (draft: RequestDraft) => core<Quote>('/requests/quote', { body: draft }),
  /** La Idempotency-Key se genera una vez por intento de compra y se repite si se reintenta. */
  createRequest: (draft: RequestDraft, idempotencyKey = uuid()) =>
    core<ServiceRequest>('/requests', { body: draft, headers: { 'Idempotency-Key': idempotencyKey } }),
  myRequests: (status?: RequestStatus, page = 0, size = 20) =>
    core<Page<ServiceRequest>>(`/requests${qs({ status, page, size })}`),
  request: (id: string) => core<ServiceRequest>(`/requests/${id}`),
  history: (id: string) => core<HistoryEntry[]>(`/requests/${id}/history`),
  cancel: (id: string, reason?: string) => core<ServiceRequest>(`/requests/${id}/cancel`, { body: { reason } }),
  confirm: (id: string) => core<ServiceRequest>(`/requests/${id}/confirm`, { body: {} }),
  workerStep: (id: string, step: 'en-route' | 'start' | 'finish') =>
    core<ServiceRequest>(`/requests/${id}/${step}`, { body: {} }),
  rate: (id: string, score: number, comment?: string) =>
    core<Rating>(`/requests/${id}/rating`, { body: { score, comment } }),
  ratings: (id: string) => core<Rating[]>(`/requests/${id}/ratings`),

  // ---------------------------------------------------------- trabajador
  workerProfile: () => core<WorkerProfile>('/workers/me'),
  saveWorkerProfile: (body: {
    bio?: string; workRadiusKm: number; categoryIds: string[]; baseLatitude?: number; baseLongitude?: number;
  }) => core<WorkerProfile>('/workers/me', { method: 'PUT', body }),
  setAvailability: (available: boolean) =>
    core<WorkerProfile>('/workers/me/availability', { method: 'PATCH', body: { available } }),
  publicWorker: (userId: string) => core<PublicWorker>(`/workers/${userId}`),

  offers: () => sub<Offer[]>('dispatch', '/offers/me'),
  acceptOffer: (offerId: string) => sub<unknown>('dispatch', `/offers/${offerId}/accept`, { body: {} }),
  rejectOffer: (offerId: string) => sub<unknown>('dispatch', `/offers/${offerId}/reject`, { body: {} }),
  sendLocation: (latitude: number, longitude: number) =>
    sub<unknown>('dispatch', '/locations/me', { method: 'PUT', body: { latitude, longitude } }),
  tracking: (requestId: string) => sub<Tracking>('dispatch', `/tracking/${requestId}`),

  // ---------------------------------------------------------- avisos
  inbox: (limit = 20) => sub<InboxItem[]>('notifications', `/notifications/me${qs({ limit })}`),
  markRead: (id: string) => sub<unknown>('notifications', `/notifications/${id}/read`, { body: {} }),

  // ---------------------------------------------------------- comprobantes
  receipt: (requestId: string, lang?: string) =>
    sub<ReceiptView>('billing', `/receipts/${requestId}${qs({ lang })}`),
  receiptHtml: (requestId: string, lang?: string) =>
    sub<string>('billing', `/receipts/${requestId}/html${qs({ lang })}`, { text: true }),

  // ---------------------------------------------------------- administración
  console: () => core<Console>('/admin/console'),
  adminUsers: (params: { rol?: Role; q?: string; page?: number; size?: number }) =>
    core<Page<User>>(`/admin/users${qs(params)}`),
  setVerification: (id: string, state: Verification) =>
    core<User>(`/admin/users/${id}/verification`, { method: 'PATCH', body: { state } }),
  activateUser: (id: string, active: boolean) =>
    core<void>(`/admin/users/${id}/${active ? 'activate' : 'deactivate'}`, { body: {} }),
  adminRequests: (params: { status?: RequestStatus; page?: number; size?: number }) =>
    core<Page<ServiceRequest>>(`/admin/requests${qs(params)}`),
  adminCategories: (page = 0, size = 100) => core<Page<AdminCategory>>(`/admin/categories${qs({ page, size })}`),
  createCategory: (body: { slug: string; name: string; description?: string }) =>
    core<AdminCategory>('/admin/categories', { body }),
  updateCategory: (id: string, body: { name: string; description?: string }) =>
    core<AdminCategory>(`/admin/categories/${id}`, { method: 'PUT', body }),
  setCategoryActive: (id: string, active: boolean) =>
    core<void>(`/admin/categories/${id}/${active ? 'activate' : 'deactivate'}`, { body: {} }),
  translateCategory: (id: string, locale: string, body: { name: string; description?: string }) =>
    core<void>(`/admin/categories/${id}/translations/${locale}`, { method: 'PUT', body }),
  priceCategory: (id: string, body: { unit: string; amountMinor: number }) =>
    core<unknown>(`/admin/categories/${id}/price`, { method: 'PUT', body }),
  saveRegionProfile: (body: Record<string, unknown>) =>
    core<RegionProfile>('/admin/region-profile', { method: 'PUT', body }),
  saveHoliday: (date: string, name: string) =>
    core<Holiday>(`/admin/region-profile/holidays/${date}`, { method: 'PUT', body: { name } }),
  deleteHoliday: (date: string) => core<void>(`/admin/region-profile/holidays/${date}`, { method: 'DELETE' }),

  rates: (limit = 50) => sub<ExchangeRate[]>('billing', `/admin/rates${qs({ limit })}`),
  refreshRates: () => sub<ExchangeRate[]>('billing', '/admin/rates/refresh', { body: {} }),
  addRate: (body: { base: string; quote: string; rate: number; source: string; asOf?: string }) =>
    sub<ExchangeRate>('billing', '/admin/rates', { body }),
  revenue: (currency: string, from?: string, to?: string) =>
    sub<Record<string, unknown>>('billing', `/admin/reports/revenue${qs({ currency, from, to })}`),
};
