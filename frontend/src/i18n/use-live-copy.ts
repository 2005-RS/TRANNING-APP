import { useContext, useMemo } from 'react';
import { LanguageContext } from '@/i18n/language-context';
import {
  currentLanguage,
  getNamespaceBundle,
  type LooseCopy,
} from '@/i18n/live-copy';

export function useLiveCopy<T extends object>(namespace: string): LooseCopy<T> {
  const language = useContext(LanguageContext)?.language ?? currentLanguage();
  return useMemo(() => getNamespaceBundle<T>(namespace, language), [language, namespace]);
}
