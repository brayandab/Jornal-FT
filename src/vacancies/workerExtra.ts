/**
 * Hoja de vida del trabajador (experiencia, habilidades, foto y documentos). El backend aún no la guarda,
 * así que vive en este navegador (localStorage, por usuario). Ver docs/pendientes-backend.md.
 */
export interface WorkerExtra {
  experience: string;
  skills: string[];
  /** Foto en data URL (se reduce antes de guardar). */
  photo?: string;
  documents: { name: string; size: number; uploadedAt: string }[];
}

const KEY = (userId: string) => `trabajoya.extra.${userId}`;

export function getExtra(userId: string): WorkerExtra {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (raw) return JSON.parse(raw) as WorkerExtra;
  } catch {
    // sin almacenamiento
  }
  return { experience: '', skills: [], documents: [] };
}

export function saveExtra(userId: string, extra: WorkerExtra): WorkerExtra {
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(extra));
  } catch {
    // almacenamiento lleno (por ejemplo, fotos grandes): se ignora
  }
  return extra;
}
