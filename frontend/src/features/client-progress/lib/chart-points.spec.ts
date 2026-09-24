import { describe, expect, it } from 'vitest';
import {
  bodyWeightPoints,
  firstLastChange,
  repsVolumePoints,
  yAxisDomain,
} from '@/features/client-progress/lib/chart-points';
import { populatedBodyMeasurements } from '@/features/client-progress/tests/fixtures';
import { factualWeightCopy, summarizeBodyTrend } from '@/features/client-progress/lib/body-trend';

describe('chart transforms', () => {
  it('orders body-weight points oldest to newest and skips null weight', () => {
    const firstMeasurement = populatedBodyMeasurements[0];
    if (!firstMeasurement) {
      throw new Error('expected a body-weight fixture');
    }
    const points = bodyWeightPoints([
      ...populatedBodyMeasurements,
      {
        ...firstMeasurement,
        id: 'b3333333-bbbb-4111-8111-b33333333333',
        bodyWeightKg: null,
      },
    ]);
    expect(points.map((point) => point.value)).toEqual([82.4, 81]);
    expect(firstLastChange(points)).toBeCloseTo(-1.4);
  });

  it('keeps zero volume points and drops empty series', () => {
    const points = repsVolumePoints([
      {
        performedAt: '2026-08-10T10:00:00.000Z',
        workoutSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        externalLoadVolumeKg: 0,
        totalReps: 0,
      },
      {
        performedAt: '2026-09-03T18:30:00.000Z',
        workoutSessionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        externalLoadVolumeKg: 3200,
        totalReps: 18,
      },
    ]);
    expect(points[0]?.value).toBe(0);
    expect(points[1]?.value).toBe(3200);
  });

  it('fits the Y domain to the series instead of starting at zero', () => {
    const points = bodyWeightPoints(populatedBodyMeasurements);
    const domain = yAxisDomain(points);
    expect(domain).toBeDefined();
    expect(domain?.[0]).toBeLessThan(81);
    expect(domain?.[0]).toBeGreaterThan(70);
    expect(domain?.[1]).toBeGreaterThan(82.4);
    expect(domain?.[1]).toBeLessThan(90);
  });
});

describe('body trend language', () => {
  it('describes change factually without good or bad labels', () => {
    const trend = summarizeBodyTrend(populatedBodyMeasurements);
    expect(trend.weightChangeKg).toBeCloseTo(-1.4);
    const copy = factualWeightCopy(trend.weightChangeKg, '12 Aug', '3 Sep');
    expect(copy).toContain('lower');
    expect(copy).not.toMatch(/great|good|bad|healthy|progress!/i);
  });
});
