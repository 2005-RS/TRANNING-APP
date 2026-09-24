import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeContext } from '@/shared/lib/theme-context';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/shared/lib/theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readThemePreference(),
  );
  const [resolved, setResolved] = useState<'dark' | 'light'>(() =>
    resolveTheme(readThemePreference()),
  );

  const apply = useCallback((next: ThemePreference) => {
    applyTheme(next);
    setResolved(resolveTheme(next));
  }, []);

  useLayoutEffect(() => {
    apply(preference);
  }, [apply, preference]);

  useEffect(() => {
    if (preference !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [apply, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
