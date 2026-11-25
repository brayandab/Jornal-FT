import { FileText, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Notice } from '../components/ui';
import { Button, Chip } from '../design/components';
import { initials } from '../design/format';
import { useApp } from '../state/AppContext';
import { saveExtra } from '../vacancies/workerExtra';
import type { WorkerExtra } from '../vacancies/workerExtra';
import { useWorker } from './WorkerContext';

const MAX_DOC_BYTES = 5 * 1024 * 1024;

/** Reduce la foto a 256 px para guardarla (hoy en el navegador; luego en el backend). */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      const scale = size / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * "Mi hoja de vida": lo que la empresa ve al revisar los postulados (experiencia, habilidades, foto y documentos).
 * El backend aún no tiene estos campos: se guardan en la capa simulada (docs/pendientes-backend.md).
 * De los documentos solo se guardan el nombre y el tamaño.
 */
export function WorkerExtraCard() {
  const { t } = useTranslation();
  const { user } = useApp();
  const { extra, setExtra } = useWorker();
  const [form, setForm] = useState<WorkerExtra>({ experience: '', skills: [], documents: [] });
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (extra) setForm(extra);
  }, [extra]);

  const addSkill = () => {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) setForm({ ...form, skills: [...form.skills, s] });
    setSkill('');
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setForm({ ...form, photo: await shrink(file) });
    } catch {
      setError(t('vac.profile.photoError'));
    }
  };

  const onDocs = (files: FileList | null) => {
    if (!files) return;
    const ok = [...files].filter((f) => f.size <= MAX_DOC_BYTES);
    if (ok.length < files.length) setError(t('vac.profile.docTooBig'));
    setForm({
      ...form,
      documents: [...form.documents, ...ok.map((f) => ({ name: f.name, size: f.size, uploadedAt: new Date().toISOString() }))],
    });
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setSaved(false);
    try {
      setExtra(saveExtra(user.id, form));
      setSaved(true);
      setError(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h2>{t('vac.profile.title')}</h2>
      <p className="tw-note">{t('vac.profile.hint')}</p>

      <div className="tw-upload" style={{ margin: '12px 0' }}>
        <span className="tw-avatar" style={{ width: 64, height: 64 }} aria-hidden="true">
          {form.photo ? <img src={form.photo} alt="" /> : initials(user?.name ?? '')}
        </span>
        <label className="btn small" style={{ cursor: 'pointer' }}>
          {t('vac.profile.photo')}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </label>
      </div>

      <div className="field">
        <label htmlFor="exp">{t('vac.profile.experience')}</label>
        <textarea id="exp" maxLength={800} value={form.experience} placeholder={t('vac.profile.experienceHint')}
          onChange={(e) => setForm({ ...form, experience: e.target.value })} />
      </div>

      <div className="field">
        <label htmlFor="skill">{t('vac.profile.skills')}</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="skill" value={skill} placeholder={t('vac.profile.skillHint')} onChange={(e) => setSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
          <Button variant="secondary" onClick={addSkill} aria-label={t('common.add')} style={{ height: 48 }}><Plus size={18} /></Button>
        </div>
        <div className="tw-chips" style={{ flexWrap: 'wrap', marginTop: 8, marginRight: 0 }}>
          {form.skills.map((s) => (
            <Chip key={s} icon={<X size={14} aria-hidden="true" />} onClick={() => setForm({ ...form, skills: form.skills.filter((x) => x !== s) })}>{s}</Chip>
          ))}
        </div>
      </div>

      <div className="field">
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t('vac.profile.documents')}</span>
        <ul className="list" style={{ margin: '6px 0' }}>
          {form.documents.map((d, i) => (
            <li key={d.name + i} className="list-row">
              <span className="tw-meta"><FileText size={16} aria-hidden="true" /> {d.name} · {Math.ceil(d.size / 1024)} KB</span>
              <button type="button" className="btn small ghost" aria-label={t('common.delete')}
                onClick={() => setForm({ ...form, documents: form.documents.filter((_, j) => j !== i) })}><X size={16} /></button>
            </li>
          ))}
        </ul>
        <label className="btn small" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
          {t('vac.profile.addDocument')}
          <input type="file" multiple accept=".pdf,image/*" className="sr-only" onChange={(e) => onDocs(e.target.files)} />
        </label>
        <small className="muted">{t('vac.profile.documentsHint')}</small>
      </div>

      {error && <p className="tw-inline-error" role="alert">{error}</p>}
      {saved && <Notice tone="ok">{t('common.saved')}</Notice>}
      <Button loading={busy} onClick={() => void save()}>{t('common.save')}</Button>
    </section>
  );
}
