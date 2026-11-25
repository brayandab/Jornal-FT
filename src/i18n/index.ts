import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deDE from './locales/de-DE.json';
import enUS from './locales/en-US.json';
import esCO from './locales/es-CO.json';
import frFR from './locales/fr-FR.json';
import jaJP from './locales/ja-JP.json';
import ptBR from './locales/pt-BR.json';

/** Idiomas de la interfaz. Si falta un texto se usa en-US (respaldo). */
export const UI_LOCALES = ['es-CO', 'pt-BR', 'en-US', 'fr-FR', 'ja-JP', 'de-DE'] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

export const LOCALE_NAMES: Record<UiLocale, string> = {
  'es-CO': 'Español (Colombia)',
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'fr-FR': 'Français (France)',
  'ja-JP': '日本語',
  'de-DE': 'Deutsch',
};

/** Nombre corto del idioma para la barra superior (cabe en 360 px). */
export const LOCALE_SHORT: Record<UiLocale, string> = {
  'es-CO': 'Español',
  'pt-BR': 'Português',
  'en-US': 'English',
  'fr-FR': 'Français',
  'ja-JP': '日本語',
  'de-DE': 'Deutsch',
};

export const resources = {
  'es-CO': { translation: esCO },
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'fr-FR': { translation: frFR },
  'ja-JP': { translation: jaJP },
  'de-DE': { translation: deDE },
};

/** Elige el idioma de la interfaz más cercano: exacto, por idioma base o en-US. */
export function resolveUiLocale(wanted: string | null | undefined): UiLocale {
  if (!wanted) return 'en-US';
  const exact = UI_LOCALES.find((l) => l.toLowerCase() === wanted.toLowerCase());
  if (exact) return exact;
  const base = wanted.split('-')[0].toLowerCase();
  return UI_LOCALES.find((l) => l.startsWith(base + '-')) ?? 'en-US';
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en-US',
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
