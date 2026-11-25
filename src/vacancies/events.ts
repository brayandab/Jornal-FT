/**
 * Aviso de que algo cambió en las vacantes: lo emiten las acciones propias (vacancies/api.ts) y los avisos que
 * llegan por WebSocket (ShellContext). Las pantallas abiertas se suscriben y recargan.
 */
const listeners = new Set<() => void>();

export function emitVacancyChange() {
  listeners.forEach((l) => l());
}

export function onVacancyChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
