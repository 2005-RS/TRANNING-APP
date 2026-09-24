import { createContext } from 'react';
import type { ThemePreference } from '@/shared/lib/theme';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'dark' | 'light';
  setPreference: (preference: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
