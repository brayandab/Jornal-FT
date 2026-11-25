import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import type { Vacancy } from './types';

/** Aviso de que el contenido de la vacante se tradujo automáticamente desde el idioma en que se escribió. */
export function TranslatedNote({ v }: { v: Vacancy }) {
  const { t } = useTranslation();
  const { locale } = useApp();
  if (!v.translated || !v.sourceLanguage) return null;
  let language = v.sourceLanguage;
  try {
    language = new Intl.DisplayNames([locale], { type: 'language' }).of(v.sourceLanguage) ?? language;
  } catch {
    // navegador sin Intl.DisplayNames: se muestra el código
  }
  return (
    <p className="tw-note" data-testid="translated-note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Languages size={16} aria-hidden="true" /> {t('vac.autoTranslated', { language })}
    </p>
  );
}
