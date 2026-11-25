import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  kind: 'place' | 'worker' | 'base';
}

const COLORS: Record<MapPoint['kind'], string> = {
  place: '#b45309',
  worker: '#0f766e',
  base: '#4338ca',
};

function Recenter({ lat, lng, follow }: { lat: number; lng: number; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow) map.panTo([lat, lng]);
  }, [lat, lng, follow, map]);
  return null;
}

function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Mapa de OpenStreetMap (Leaflet): lugar del trabajo, ubicación base y posición en vivo del trabajador. */
export function MapView({
  points,
  center,
  onPick,
  follow = false,
  line = false,
  height = 280,
  ariaLabel,
}: {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  onPick?: (lat: number, lng: number) => void;
  follow?: boolean;
  line?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  const c = center ?? (points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: 4.65, lng: -74.09 });
  const worker = points.find((p) => p.kind === 'worker');
  const place = points.find((p) => p.kind === 'place');
  return (
    <div className="map" style={{ height }} role="region" aria-label={ariaLabel}>
      <MapContainer center={[c.lat, c.lng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p) => (
          <CircleMarker
            key={p.kind + p.label}
            center={[p.lat, p.lng]}
            radius={p.kind === 'worker' ? 10 : 8}
            pathOptions={{ color: COLORS[p.kind], fillColor: COLORS[p.kind], fillOpacity: 0.85 }}
          >
            <Tooltip permanent={p.kind === 'worker'} direction="top">
              {p.label}
            </Tooltip>
          </CircleMarker>
        ))}
        {line && worker && place && (
          <Polyline positions={[[worker.lat, worker.lng], [place.lat, place.lng]]} pathOptions={{ dashArray: '6 6', color: '#64748b' }} />
        )}
        {follow && worker && <Recenter lat={worker.lat} lng={worker.lng} follow />}
        {!follow && center && <Recenter lat={center.lat} lng={center.lng} follow />}
        {onPick && <Picker onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
