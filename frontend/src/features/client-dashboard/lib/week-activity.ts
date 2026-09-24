import { format } from 'date-fns';
import type { ClientDashboardCompletedSessionDto } from '@/generated/models';
import {
  lastLocalDays,
  localDayKey,
  localDayKeyFromIso,
} from '@/features/client-dashboard/lib/formatters';
import { CLIENT_DASHBOARD_PERIOD_DAYS } from '@/features/client-dashboard/lib/query-policy';

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
      label: format(day, 'EEEEEE'),
      fullLabel: format(day, 'EEEE d MMMM'),
      trained: trainedDays.has(key),
      isToday: key === todayKey,
    };
  });
}

export function trainedDayCount(markers: WeekDayMarker[]): number {
  return markers.filter((marker) => marker.trained).length;
}
