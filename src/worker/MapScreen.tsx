import { useTranslation } from 'react-i18next';
import { ZoneMap } from '../design/ZoneMap';
import { useWorker } from './WorkerContext';

/** Pestaña Mapa: zona del trabajador con las vacantes abiertas cercanas. */
export function MapScreen() {
  const { t } = useTranslation();
  const w = useWorker();
  const open = w.nearby.filter((n) => !n.vacancy.myApplication);
  return (
    <div>
      <h1 style={{ margin: '0 0 12px' }}>{t('shell.nav.map')}</h1>
      <div className="tw-zone-map" style={{ height: '62vh', margin: 0 }}>
        <ZoneMap me={w.base} pins={open.map((n) => ({ lat: n.vacancy.latitude, lng: n.vacancy.longitude }))} interactive zoom={13} />
      </div>
      <p className="tw-note" style={{ marginTop: 12 }}>{t('vac.mapHint', { count: open.length, km: w.radiusKm })}</p>
    </div>
  );
}
