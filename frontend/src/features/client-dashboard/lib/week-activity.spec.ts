import { describe, expect, it } from 'vitest';
import { weekDayMarkers } from '@/features/client-dashboard/lib/week-activity';

describe('week activity markers', () => {
  it('marks local days that have a completed session startedAt', () => {
    const now = new Date(2026, 8, 4, 12);
    const markers = weekDayMarkers(
      [
        {
          id: '1',
          workoutName: 'Upper A',
          startedAt: new Date(2026, 8, 2, 10).toISOString(),
          completedAt: new Date(2026, 8, 2, 11).toISOString(),
          performedSetCount: 12,
        },
      ],
      now,
    );

    expect(markers).toHaveLength(7);
    expect(markers.filter((marker) => marker.trained)).toHaveLength(1);
    expect(markers[markers.length - 1]?.trained).toBe(false);
    expect(markers[markers.length - 1]?.isToday).toBe(true);
  });
});
