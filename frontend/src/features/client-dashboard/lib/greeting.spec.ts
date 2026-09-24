import { describe, expect, it } from 'vitest';
import {
  displayFirstName,
  greetingHeadline,
  greetingPeriod,
} from '@/features/client-dashboard/lib/greeting';

describe('dashboard greeting', () => {
  it('uses morning, afternoon, and evening from local hours', () => {
    expect(greetingPeriod(new Date(2026, 8, 4, 7))).toBe('morning');
    expect(greetingPeriod(new Date(2026, 8, 4, 13))).toBe('afternoon');
    expect(greetingPeriod(new Date(2026, 8, 4, 20))).toBe('evening');
  });

  it('falls back when first name is missing and never uses an id', () => {
    expect(displayFirstName('  Ada  ')).toBe('Ada');
    expect(displayFirstName('')).toBe('there');
    expect(greetingHeadline('Ada', new Date(2026, 8, 4, 7))).toBe('Good morning, Ada');
  });
});
