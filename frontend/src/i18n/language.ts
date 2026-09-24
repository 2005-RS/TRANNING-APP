import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isAppLanguage,
  type AppLanguage,
} from '@/i18n/constants';
import { i18nInstance } from '@/i18n/instance';

export function readLanguagePreference(): AppLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function persistLanguagePreference(language: AppLanguage): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Preference persistence is best-effort.
  }
}

export function applyHtmlLang(language: AppLanguage): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.lang = language;
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  persistLanguagePreference(language);
  applyHtmlLang(language);
  if (i18nInstance.isInitialized && i18nInstance.language !== language) {
    await i18nInstance.changeLanguage(language);
  }
}

export function resetLanguageForTests(): void {
  persistLanguagePreference(DEFAULT_LANGUAGE);
  applyHtmlLang(DEFAULT_LANGUAGE);
  if (i18nInstance.isInitialized) {
    void i18nInstance.changeLanguage(DEFAULT_LANGUAGE);
  }
}
