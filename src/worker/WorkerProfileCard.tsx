import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/endpoints';
import { MapView } from '../components/MapView';
import { ErrorBox, Field, Notice, Stars } from '../components/ui';
import { centerOf } from '../lib/regions';
import { useAction, useAsync } from '../lib/useAsync';
import { useApp } from '../state/AppContext';
import { Button } from '../design/components';
import { useWorker } from './WorkerContext';

/** Perfil de trabajador (datos reales del backend): sobre mí, radio, servicios y ubicación base. */
export function WorkerProfileCard() {
  const { t } = useTranslation();
  const { locale, region } = useApp();
  const w = useWorker();
  const categories = useAsync(() => api.categories(), [locale]);
  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [base, setBase] = useState<{ lat: number; lng: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const p = w.profile;

  useEffect(() => {
    if (!p) return;
    setBio(p.bio ?? '');
    setRadius(p.workRadiusKm ?? 10);
    setSelected(p.categories?.map((c) => c.id) ?? []);
    setBase(p.baseLatitude != null && p.baseLongitude != null ? { lat: p.baseLatitude, lng: p.baseLongitude } : null);
  }, [p]);

  const save = useAction(async () => {
    await api.saveWorkerProfile({
      bio: bio || undefined, workRadiusKm: radius, categoryIds: selected,
      baseLatitude: base?.lat, baseLongitude: base?.lng,
    });
    await w.reloadProfile();
    setSaved(true);
  });

  const point = base ?? centerOf(region);
  return (
    <section className="card">
      <h2>{t('worker.profile')}</h2>
      {p && p.ratingCount > 0 && (
        <p className="small"><Stars value={Math.round(p.ratingAvg ?? 0)} /> {p.ratingAvg?.toFixed(1)} ({p.ratingCount})</p>
      )}
      <form onSubmit={(e) => { e.preventDefault(); setSaved(false); void save.run(); }}>
        <Field label={t('worker.bio')} value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        <Field label={t('worker.radius')} type="number" min={1} max={100} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        <fieldset>
          <legend>{t('worker.categories')}</legend>
          <div className="chips">
            {categories.data?.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button key={c.id} type="button" aria-pressed={on} className={on ? 'chip-btn selected' : 'chip-btn'}
                  onClick={() => setSelected(on ? selected.filter((x) => x !== c.id) : [...selected, c.id])}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="small">{t('worker.baseHint')}</p>
        <MapView ariaLabel={t('worker.base')} height={220}
          points={base ? [{ ...base, label: t('worker.base'), kind: 'base' }] : []}
          center={point} onPick={(lat, lng) => setBase({ lat, lng })} />
        <ErrorBox error={save.error} />
        {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
        <Button type="submit" loading={save.busy} disabled={selected.length === 0}>{t('common.save')}</Button>
      </form>
    </section>
  );
}
