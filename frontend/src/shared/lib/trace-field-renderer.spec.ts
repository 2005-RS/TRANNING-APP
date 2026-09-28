import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  capDevicePixelRatio,
  createTraceFieldRenderer,
  luminance,
  parseCssRgb,
  phasesAt,
} from '@/shared/lib/trace-field-renderer';

const TAU = Math.PI * 2;

describe('trace field renderer helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps every phase inside one turn, for long and negative times', () => {
    for (const seconds of [0, 1.5, 37, 86_400, -12]) {
      for (const phase of phasesAt(seconds)) {
        expect(phase).toBeGreaterThanOrEqual(0);
        expect(phase).toBeLessThan(TAU);
      }
    }
  });

  it('moves phases smoothly between frames', () => {
    const before = phasesAt(100);
    const after = phasesAt(100 + 1 / 30);
    before.forEach((phase, index) => {
      const step = Math.abs((after[index] ?? 0) - phase);
      expect(Math.min(step, TAU - step)).toBeLessThan(0.05);
    });
  });

  it('caps the device pixel ratio by screen width', () => {
    expect(capDevicePixelRatio(1440, 3)).toBe(2);
    expect(capDevicePixelRatio(390, 3)).toBe(1.5);
    expect(capDevicePixelRatio(1440, 1.25)).toBe(1.25);
    expect(capDevicePixelRatio(1440, 0.5)).toBe(1);
    expect(capDevicePixelRatio(1440, Number.NaN)).toBe(1);
  });

  it('parses the color formats browsers compute', () => {
    expect(parseCssRgb('#0c0c0e')).toEqual([12 / 255, 12 / 255, 14 / 255]);
    expect(parseCssRgb('#fff')).toEqual([1, 1, 1]);
    expect(parseCssRgb('rgb(59, 130, 246)')).toEqual([59 / 255, 130 / 255, 246 / 255]);
    expect(parseCssRgb('rgba(0, 0, 0, 0.5)')).toEqual([0, 0, 0]);
    expect(parseCssRgb('rgb(12 12 14 / 50%)')).toEqual([12 / 255, 12 / 255, 14 / 255]);
    expect(parseCssRgb('oklch(0.6 0.2 250)')).toBeNull();
    expect(parseCssRgb('')).toBeNull();
  });

  it('measures luminance so light themes can soften the traces', () => {
    expect(luminance([0, 0, 0])).toBe(0);
    expect(luminance([1, 1, 1])).toBeCloseTo(1);
    expect(luminance([244 / 255, 244 / 255, 245 / 255])).toBeGreaterThan(0.5);
    expect(luminance([12 / 255, 12 / 255, 14 / 255])).toBeLessThan(0.5);
  });

  it('returns no renderer when the browser gives no WebGL context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(createTraceFieldRenderer(document.createElement('canvas'))).toBeNull();
  });
});
