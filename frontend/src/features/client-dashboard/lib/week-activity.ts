import { format } from 'date-fns';
import type { ClientDashboardCompletedSessionDto } from '@/generated/models';
import {
  lastLocalDays,
  localDayKey,
  localDayKeyFromIso,
} from '@/features/client-dashboard/lib/formatters';
import { CLIENT_DASHBOARD_PERIOD_DAYS } from '@/features/client-dashboard/lib/query-policy';
import { currentIntlLocale } from '@/i18n/format';

export type WeekDayMarker = {
  key: string;
  label: string;
  fullLabel: string;
  trained: boolean;
  isToday: boolean;
};

export function weekDayMarkers(
  completedSessions: ClientDashboardCompletedSessionDto[],
  now = new Date(),
): WeekDayMarker[] {
  const trainedDays = new Set(
    completedSessions
      .map((session) => localDayKeyFromIso(session.startedAt))
      .filter((key): key is string => key !== null),
  );
  const todayKey = localDayKey(now);

  return lastLocalDays(CLIENT_DASHBOARD_PERIOD_DAYS, now).map((day) => {
    const key = localDayKey(day);
    return {
      key,
      ...dayLabels(day),
      trained: trainedDays.has(key),
      isToday: key === todayKey,
    };
  });
}

export function trainedDayCount(markers: WeekDayMarker[]): number {
  return markers.filter((marker) => marker.trained).length;
}

const SPANISH_DAY_LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** English keeps the original two-letter style ("Mo"); other languages use Intl (es: "L", "lunes 6 de octubre"). */
function dayLabels(day: Date): { label: string; fullLabel: string } {
  const locale = currentIntlLocale();
  if (locale.startsWith('en')) {
    return { label: format(day, 'EEEEEE'), fullLabel: format(day, 'EEEE d MMMM') };
  }
  return {
    // Spanish convention: X for miércoles so it does not repeat martes' M.
    label: locale.startsWith('es')
      ? (SPANISH_DAY_LETTERS[day.getDay()] ?? '')
      : new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(day).toUpperCase(),
    fullLabel: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day),
  };
}
