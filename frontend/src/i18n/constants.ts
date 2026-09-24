export const LANGUAGE_STORAGE_KEY = 'UI_LANGUAGE';

export const APP_LANGUAGES = ['en', 'es'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'en' || value === 'es';
}

export function intlLocaleFor(language: AppLanguage): string {
  return language === 'es' ? 'es-CR' : 'en-US';
}
