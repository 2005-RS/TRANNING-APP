import { estimated1RmKg } from './progress-metrics.util';

describe('estimated1RmKg', () => {
  it('uses Epley load × (1 + reps / 30) and rounds to 2 decimals', () => {
    expect(estimated1RmKg(90, 5)).toBe(105);
    expect(estimated1RmKg(85, 8)).toBe(107.67);
    expect(estimated1RmKg(80, 10)).toBe(106.67);
  });

  it('rejects reps above 10, zero/negative load, and non-positive reps', () => {
    expect(estimated1RmKg(60, 15)).toBeNull();
    expect(estimated1RmKg(0, 20)).toBeNull();
    expect(estimated1RmKg(80, 0)).toBeNull();
    expect(estimated1RmKg(-10, 5)).toBeNull();
  });
});
