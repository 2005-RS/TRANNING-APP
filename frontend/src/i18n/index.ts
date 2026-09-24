import { initReactI18next } from 'react-i18next';
import { authCopySource } from '@/features/auth/copy';
import {
  adminCopySource,
  clientCopySource,
  navigationCopySource,
  trainerCopySource,
} from '@/features/navigation/copy';
import { clientDashboardCopySource } from '@/features/client-dashboard/copy';
import { workoutCopySource } from '@/features/workout-session/copy';
import { clientProgressCopySource } from '@/features/client-progress/copy';
import { clientNutritionCopySource } from '@/features/client-nutrition/copy';
import { clientBodyCopySource } from '@/features/client-body/copy';
import { clientCheckInsCopySource } from '@/features/client-check-ins/copy';
import { trainerWorkspaceCopySource } from '@/features/trainer-workspace/copy';
import { adminWorkspaceCopySource } from '@/features/admin-workspace/copy';
import { commonCopySource } from '@/i18n/locales/en/common';
import { esCommon } from '@/i18n/locales/es/common';
import { esAuth } from '@/i18n/locales/es/auth';
import { esAdminNav, esClientNav, esNavigation, esTrainerNav } from '@/i18n/locales/es/navigation';
import { esClientDashboard } from '@/i18n/locales/es/client-dashboard';
import { esWorkout } from '@/i18n/locales/es/workout';
import { esClientProgress } from '@/i18n/locales/es/client-progress';
import { esClientNutrition } from '@/i18n/locales/es/client-nutrition';
import { esClientBody } from '@/i18n/locales/es/client-body';
import { esClientCheckIns } from '@/i18n/locales/es/client-check-ins';
import { esTrainerWorkspace } from '@/i18n/locales/es/trainer';
import { esAdminWorkspace } from '@/i18n/locales/es/admin';
import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
} from '@/i18n/constants';
import { i18nInstance } from '@/i18n/instance';
import { applyHtmlLang, readLanguagePreference } from '@/i18n/language';

const initialLanguage = readLanguagePreference();

void i18nInstance.use(initReactI18next).init({
  lng: initialLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ['en', 'es'],
  nonExplicitSupportedLngs: false,
  interpolation: { escapeValue: false },
  resources: {
    en: {
      common: commonCopySource,
      auth: authCopySource,
      navigation: navigationCopySource,
      clientNav: clientCopySource,
      trainerNav: trainerCopySource,
      adminNav: adminCopySource,
      clientDashboard: clientDashboardCopySource,
      workout: workoutCopySource,
      clientProgress: clientProgressCopySource,
      clientNutrition: clientNutritionCopySource,
      clientBody: clientBodyCopySource,
      clientCheckIns: clientCheckInsCopySource,
      trainerWorkspace: trainerWorkspaceCopySource,
      adminWorkspace: adminWorkspaceCopySource,
    },
    es: {
      common: esCommon,
      auth: esAuth,
      navigation: esNavigation,
      clientNav: esClientNav,
      trainerNav: esTrainerNav,
      adminNav: esAdminNav,
      clientDashboard: esClientDashboard,
      workout: esWorkout,
      clientProgress: esClientProgress,
      clientNutrition: esClientNutrition,
      clientBody: esClientBody,
      clientCheckIns: esClientCheckIns,
      trainerWorkspace: esTrainerWorkspace,
      adminWorkspace: esAdminWorkspace,
    },
  },
});

if (!isAppLanguage(i18nInstance.language)) {
  void i18nInstance.changeLanguage(DEFAULT_LANGUAGE);
}

applyHtmlLang(isAppLanguage(i18nInstance.language) ? i18nInstance.language : DEFAULT_LANGUAGE);

export { i18nInstance as i18n };
export { LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE, type AppLanguage } from '@/i18n/constants';
export { LanguageProvider } from '@/i18n/language-provider';
export { useLanguage } from '@/i18n/use-language';
export { useLiveCopy } from '@/i18n/use-live-copy';
export { LanguageSwitcher, LanguageMenuItems } from '@/i18n/language-switcher';
