import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LanguageContext } from '@/i18n/language-context';
import {
  applyHtmlLang,
  changeAppLanguage,
  readLanguagePreference,
} from '@/i18n/language';
import { isAppLanguage, type AppLanguage } from '@/i18n/constants';
import { i18nInstance } from '@/i18n/instance';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readLanguagePreference());

  useLayoutEffect(() => {
    applyHtmlLang(language);
  }, [language]);

  useEffect(() => {
    function onChange(next: string) {
      if (isAppLanguage(next)) {
        setLanguageState(next);
      }
    }
    i18nInstance.on('languageChanged', onChange);
    return () => {
      i18nInstance.off('languageChanged', onChange);
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    void changeAppLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div className="contents" key={language}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}
