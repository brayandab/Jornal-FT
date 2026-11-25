import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Polygon, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LatLng } from '../vacancies/types';

/**
 * Mapa de la zona del trabajador sobre OpenStreetMap (pendiente 10.5): ubicación con halo, celdas hexagonales
 * de su zona y pines de las ofertas. Las celdas se calculan en el cliente; el backend no organiza zonas por celdas.
 */

const PRIMARY = '#4b4fb5';

function hexagon(center: LatLng, radiusKm: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i + 30) * Math.PI) / 180;
    pts.push([
      center.lat + (radiusKm * Math.sin(a)) / 111.32,
      center.lng + (radiusKm * Math.cos(a)) / (111.32 * Math.cos((center.lat * Math.PI) / 180)),
    ]);
  }
  return pts;
}

/** Celda central y su anillo de 6 vecinas. */
function hexCells(center: LatLng, radiusKm: number): [number, number][][] {
  const cells = [hexagon(center, radiusKm)];
  const d = Math.sqrt(3) * radiusKm;
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i) * Math.PI) / 180;
    cells.push(
      hexagon(
        {
          lat: center.lat + (d * Math.sin(a)) / 111.32,
          lng: center.lng + (d * Math.cos(a)) / (111.32 * Math.cos((center.lat * Math.PI) / 180)),
        },
        radiusKm,
      ),
    );
  }
  return cells;
}

const meIcon = L.divIcon({ className: '', html: '<div class="tw-marker-me"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
const pinIcon = L.divIcon({
  className: 'tw-marker-pin',
  html: `<svg width="26" height="32" viewBox="0 0 26 32" aria-hidden="true"><path d="M13 31s11-10.2 11-18A11 11 0 0 0 2 13c0 7.8 11 18 11 18z" fill="${PRIMARY}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4" fill="#fff"/></svg>`,
  iconSize: [26, 32],
  iconAnchor: [13, 31],
});
const workIcon = L.divIcon({
  className: '',
  html: '<div class="tw-marker-work"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function ZoneMap({
  me, pins = [], work, interactive = false, zoom = 13, cellKm = 0.9,
}: { me: LatLng; pins?: LatLng[]; work?: LatLng; interactive?: boolean; zoom?: number; cellKm?: number }) {
  const fitTo = work ? [me, work] : [];
  return (
    <MapContainer
      center={[me.lat, me.lng]}
      zoom={zoom}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={false}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      keyboard={interactive}
      attributionControl={interactive}
    >
      {/* OpenStreetMap (gratuito, sin clave). CARTO Voyager se parecía más a la paleta del mockup, pero ahora exige clave de API. */}
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {hexCells(me, cellKm).map((cell, i) => (
        <Polygon key={i} positions={cell}
          pathOptions={{ color: PRIMARY, opacity: 0.35, weight: 1, fillColor: PRIMARY, fillOpacity: 0.15 }} />
      ))}
      {work && <Polyline positions={[[me.lat, me.lng], [work.lat, work.lng]]} pathOptions={{ color: PRIMARY, weight: 3, dashArray: '6 6' }} />}
      {pins.map((p, i) => <Marker key={i} position={[p.lat, p.lng]} icon={pinIcon} keyboard={false} interactive={false} />)}
      {work && <Marker position={[work.lat, work.lng]} icon={workIcon} keyboard={false} interactive={false} />}
      <Marker position={[me.lat, me.lng]} icon={meIcon} keyboard={false} interactive={false} />
      {work && <Fit points={fitTo} />}
    </MapContainer>
  );
}
