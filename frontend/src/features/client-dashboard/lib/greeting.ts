import { clientDashboardCopy } from '@/features/client-dashboard/copy';
import { formatInstant } from '@/i18n/format';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function greetingPeriod(now = new Date()): GreetingPeriod {
  const hour = now.getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

export function displayFirstName(firstName: string | null | undefined): string {
  const trimmed = firstName?.trim();
  return trimmed ? trimmed : clientDashboardCopy.greeting.fallbackName;
}

export function greetingHeadline(firstName: string | null | undefined, now = new Date()): string {
  const period = greetingPeriod(now);
  const name = displayFirstName(firstName);
  return `${clientDashboardCopy.greeting[period]}, ${name}`;
}

export function greetingSupportLine(now = new Date()): string {
  const period = greetingPeriod(now);
  if (period === 'morning') {
    return clientDashboardCopy.greeting.morningLine;
  }
  if (period === 'afternoon') {
    return clientDashboardCopy.greeting.afternoonLine;
  }
  return clientDashboardCopy.greeting.eveningLine;
}

export function formatLocalDateContext(now = new Date()): string {
  return formatInstant(now, 'EEEE, d MMMM') ?? '';
}
