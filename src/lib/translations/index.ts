import fr, { type TranslationKeys } from './fr';
import en from './en';

export type Language = 'fr' | 'en';

const translations: Record<Language, TranslationKeys> = {
  fr,
  en: en as unknown as TranslationKeys,
};

let currentLanguage: Language = 'fr';

export function setCurrentLanguage(lang: Language) {
  currentLanguage = lang;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Get a nested translation value by dot-notation key path.
 * Example: t('landing.hero.title') returns the translated string.
 */
export function getTranslation(lang: Language): TranslationKeys {
  return translations[lang];
}

export { fr, en };
export type { TranslationKeys };
