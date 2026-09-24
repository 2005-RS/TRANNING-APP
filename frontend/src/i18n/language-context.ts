import { createContext } from 'react';
import type { AppLanguage } from '@/i18n/constants';

export type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
