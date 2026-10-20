// Runs before tests/setup.ts (which imports '@/i18n').
// The product defaults to Spanish, but most UI specs assert the English copy source,
// so tests start in English. Language specs switch explicitly with changeAppLanguage().
import { LANGUAGE_STORAGE_KEY, TEST_LANGUAGE } from '@/i18n/constants';

window.localStorage.setItem(LANGUAGE_STORAGE_KEY, TEST_LANGUAGE);
