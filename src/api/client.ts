import { coreUrl, subsystemUrl } from '../config';
import type { Problem, TokenResponse } from './types';

/**
 * Cliente HTTP de la app. Las URLs base salen de src/config.ts (variables VITE_...). Por defecto, el gateway:
 *   core:        /api/{región}/...
 *   subsistemas: /subsystems/{payments|dispatch|notifications|billing}/...
 * Cada petición lleva Authorization, Accept-Language y X-Correlation-Id. Ante un 401 intenta
 * POST /auth/refresh una sola vez y, si falla, cierra la sesión.
 * El refresh token vive en memoria y en sessionStorage (nunca en localStorage).
 */

export class ApiError extends Error {
  readonly problem: Problem;

  constructor(problem: Problem) {
    super(problem.detail || problem.title || `HTTP ${problem.status}`);
    this.problem = problem;
  }

  get code(): string | undefined {
    return this.problem.code;
  }

  get status(): number {
    return this.problem.status;
  }
}

const STORAGE_KEY = 'trabajoya.session';

interface Stored {
  region: string | null;
  locale: string | null;
  refreshToken: string | null;
}

interface SessionState extends Stored {
  accessToken: string | null;
}

type Listener = () => void;

function load(): Stored {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    // sin almacenamiento: la sesión vive solo en memoria
  }
  return { region: null, locale: null, refreshToken: null };
}

let state: SessionState = { ...load(), accessToken: null };
const listeners = new Set<Listener>();

function persist() {
  try {
    const { region, locale, refreshToken } = state;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ region, locale, refreshToken }));
  } catch {
    // ignorado
  }
}

export const session = {
  get: (): Readonly<SessionState> => state,
  set(patch: Partial<SessionState>) {
    state = { ...state, ...patch };
    persist();
    listeners.forEach((l) => l());
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setTokens(tokens: TokenResponse) {
    session.set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },
  clearTokens() {
    session.set({ accessToken: null, refreshToken: null });
  },
};

export function uuid(): string {
  return crypto.randomUUID();
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Sin Authorization (registro, login, refresh, perfil regional). */
  anonymous?: boolean;
  /** Devuelve el texto tal cual (por ejemplo el comprobante HTML). */
  text?: boolean;
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const { refreshToken, region } = state;
  if (!refreshToken || !region) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${coreUrl(region)}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      session.setTokens((await res.json()) as TokenResponse);
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

/** Restaura la sesión al recargar la página (solo hay refresh token guardado). */
export async function restoreSession(): Promise<boolean> {
  if (state.accessToken) return true;
  return refresh();
}

async function send(url: string, opts: RequestOptions, retry: boolean): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: opts.text ? 'text/html' : 'application/json',
    'X-Correlation-Id': uuid(),
    ...opts.headers,
  };
  if (state.locale) headers['Accept-Language'] = state.locale;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!opts.anonymous && state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK', detail: '' });
  }

  if (res.status === 401 && !opts.anonymous && retry) {
    if (await refresh()) return send(url, opts, false);
    session.clearTokens();
  }

  if (!res.ok) {
    let problem: Problem = { status: res.status };
    try {
      problem = { ...((await res.json()) as Problem), status: res.status };
    } catch {
      // cuerpo vacío o no JSON (por ejemplo el 503 del gateway cuando cae una región)
    }
    throw new ApiError(problem);
  }
  if (res.status === 204) return undefined;
  const raw = await res.text();
  if (opts.text) return raw;
  return raw ? JSON.parse(raw) : undefined;
}

/** Petición al core de la región de la sesión. */
export function core<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!state.region) throw new ApiError({ status: 0, code: 'NO_REGION' });
  return send(`${coreUrl(state.region)}${path}`, opts, true) as Promise<T>;
}

/** Petición al core de una región concreta (selector de país, antes de iniciar sesión). */
export function coreOf<T>(region: string, path: string, opts: RequestOptions = {}): Promise<T> {
  return send(`${coreUrl(region)}${path}`, opts, true) as Promise<T>;
}

export type Subsystem = 'payments' | 'dispatch' | 'notifications' | 'billing';

export function sub<T>(name: Subsystem, path: string, opts: RequestOptions = {}): Promise<T> {
  return send(`${subsystemUrl(name)}${path}`, opts, true) as Promise<T>;
}

/** Lee el contenido (sin validar la firma) del access token: sub, role, region. */
export function tokenClaims(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(part)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
