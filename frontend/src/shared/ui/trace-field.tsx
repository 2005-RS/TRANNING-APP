import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/shared/lib/motion';
import {
  NO_CLEAR_BOX,
  STILL_FRAME_SECONDS,
  capDevicePixelRatio,
  createTraceFieldRenderer,
  luminance,
  phasesAt,
  readTraceFieldPalette,
  type TraceFieldBox,
  type TraceFieldPalette,
  type TraceFieldRenderer,
  type TraceFieldScene,
} from '@/shared/lib/trace-field-renderer';

/** The field moves slowly; 30 fps looks the same as 60 and costs half. */
const FRAME_INTERVAL_MS = 1000 / 30;
/** Longest gap counted as animation time, so a stalled tab does not jump. */
const MAX_FRAME_GAP_MS = 100;
const COMPACT_BREAKPOINT_PX = 768;
/** Narrow heroes have less room below the copy, so ridges stay lower. */
const COMPACT_HEIGHT_SCALE = 0.7;

export type TraceFieldProps = {
  focusX: number;
  focusY: number;
  compactFocusX: number;
  compactFocusY: number;
  intensity: number;
};

type Settings = TraceFieldProps & { reduceMotion: boolean };

/**
 * Loaded lazily by AmbientField. The canvas stays transparent until the first
 * frame is drawn (`data-state`), so the CSS atmosphere underneath is the
 * fallback whenever WebGL is missing, blocked, or lost.
 *
 * The hero marks its copy with `data-field-clear`; traces fade out around that
 * box, whatever the language or screen size.
 */
export default function TraceField({
  focusX,
  focusY,
  compactFocusX,
  compactFocusY,
  intensity,
}: TraceFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const settingsRef = useRef<Settings>({
    focusX,
    focusY,
    compactFocusX,
    compactFocusY,
    intensity,
    reduceMotion,
  });
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = { focusX, focusY, compactFocusX, compactFocusY, intensity, reduceMotion };
    refreshRef.current?.();
  }, [focusX, focusY, compactFocusX, compactFocusY, intensity, reduceMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let renderer: TraceFieldRenderer | null = null;
    let palette: TraceFieldPalette | null = null;
    let failed = false;
    let inView = false;
    let frame = 0;
    let lastTick = 0;
    let lastDraw = 0;
    let elapsedSeconds = 0;
    let cssWidth = 0;
    let cssHeight = 0;
    let clear: TraceFieldBox = NO_CLEAR_BOX;

    const clearElement =
      canvas
        .closest('[data-slot="ambient-field"]')
        ?.parentElement?.querySelector<HTMLElement>('[data-field-clear]') ?? null;

    const stop = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const fail = () => {
      failed = true;
      stop();
      canvas.dataset.state = 'unavailable';
    };

    const scene = (): TraceFieldScene => {
      const settings = settingsRef.current;
      const compact = cssWidth < COMPACT_BREAKPOINT_PX;
      const lightTheme = palette ? luminance(palette.background) > 0.5 : false;
      return {
        focusX: compact ? settings.compactFocusX : settings.focusX,
        focusY: compact ? settings.compactFocusY : settings.focusY,
        intensity: settings.intensity * (compact ? 0.8 : 1) * (lightTheme ? 0.75 : 1),
        heightScale: compact ? COMPACT_HEIGHT_SCALE : 1,
        clear,
      };
    };

    const layout = () => {
      if (!renderer) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      cssWidth = rect.width;
      cssHeight = rect.height;
      if (clearElement) {
        const box = clearElement.getBoundingClientRect();
        clear = [box.left - rect.left, box.top - rect.top, box.right - rect.left, box.bottom - rect.top];
      }
      if (cssWidth >= 1 && cssHeight >= 1) {
        renderer.resize(cssWidth, cssHeight, capDevicePixelRatio(cssWidth, window.devicePixelRatio));
      }
    };

    const currentSeconds = () =>
      settingsRef.current.reduceMotion ? STILL_FRAME_SECONDS : elapsedSeconds;

    const paint = () => {
      if (renderer && palette && cssWidth >= 1 && cssHeight >= 1) {
        renderer.draw(phasesAt(currentSeconds()), palette, scene());
      }
    };

    const ensureRenderer = () => {
      if (renderer) {
        return true;
      }
      if (failed) {
        return false;
      }
      renderer = createTraceFieldRenderer(canvas);
      palette = readTraceFieldPalette();
      if (!renderer || !palette) {
        fail();
        return false;
      }
      layout();
      return true;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      elapsedSeconds += Math.min(now - lastTick, MAX_FRAME_GAP_MS) / 1000;
      lastTick = now;
      if (now - lastDraw < FRAME_INTERVAL_MS) {
        return;
      }
      lastDraw = now;
      paint();
    };

    const pause = () => {
      stop();
      if (renderer) {
        canvas.dataset.state = 'paused';
      }
    };

    const sync = () => {
      if (failed) {
        stop();
        return;
      }
      if (!inView) {
        pause();
        return;
      }
      if (!ensureRenderer()) {
        return;
      }
      if (settingsRef.current.reduceMotion) {
        stop();
        paint();
        canvas.dataset.state = 'still';
        return;
      }
      if (document.hidden) {
        pause();
        return;
      }
      if (!frame) {
        paint();
        lastTick = performance.now();
        lastDraw = lastTick;
        frame = requestAnimationFrame(tick);
      }
      canvas.dataset.state = 'running';
    };

    refreshRef.current = () => {
      paint();
      sync();
    };

    const resizeObserver = new ResizeObserver(() => {
      layout();
      paint();
    });
    resizeObserver.observe(canvas);
    if (clearElement) {
      resizeObserver.observe(clearElement);
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      sync();
    });
    intersectionObserver.observe(canvas);

    // Theme changes swap the token values on <html>; re-read them.
    const themeObserver = new MutationObserver(() => {
      if (!renderer) {
        return;
      }
      palette = readTraceFieldPalette() ?? palette;
      paint();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    const handleContextLost = () => fail();
    canvas.addEventListener('webglcontextlost', handleContextLost);
    document.addEventListener('visibilitychange', sync);

    return () => {
      stop();
      refreshRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      document.removeEventListener('visibilitychange', sync);
      // A detached canvas is a real unmount; a connected one is a Strict Mode
      // re-run that will reuse the same context.
      renderer?.dispose(!canvas.isConnected);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-slot="trace-field"
      className="trace-field pointer-events-none absolute inset-0 block size-full"
    />
  );
}
