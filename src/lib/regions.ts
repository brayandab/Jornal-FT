// Datos de presentación por región (no son reglas de negocio): centro inicial del mapa.
// No se usan banderas emoji: Windows no las dibuja (muestra las letras); se usa el código del país.
// Las reglas de cada país (impuestos, direcciones, medios de pago, propina...) vienen del perfil regional.

export const MAP_CENTER: Record<string, { lat: number; lng: number }> = {
  co: { lat: 4.6584, lng: -74.0937 },
  br: { lat: -23.5558, lng: -46.6623 },
  us: { lat: 40.7484, lng: -73.9857 },
  fr: { lat: 48.8559, lng: 2.3601 },
  jp: { lat: 35.6812, lng: 139.7671 },
  de: { lat: 52.52, lng: 13.405 },
};


/** Ciudad del centro del mapa (datos de ejemplo de las vacantes simuladas). */
export const CITY: Record<string, string> = {
  co: 'Bogotá',
  br: 'São Paulo',
  us: 'New York',
  fr: 'Paris',
  jp: '東京',
  de: 'Berlin',
};

export function centerOf(region: string | null): { lat: number; lng: number } {
  return (region && MAP_CENTER[region]) || { lat: 0, lng: 0 };
}
