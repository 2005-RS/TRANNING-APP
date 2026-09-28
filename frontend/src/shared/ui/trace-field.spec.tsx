import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TraceFieldPalette, TraceFieldRenderer } from '@/shared/lib/trace-field-renderer';
import TraceField from '@/shared/ui/trace-field';

const motionState = vi.hoisted(() => ({ reduce: false }));
const rendererMocks = vi.hoisted(() => ({
  create: vi.fn(),
  palette: vi.fn(),
}));

vi.mock('@/shared/lib/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/motion')>()),
  useReducedMotion: () => motionState.reduce,
}));

vi.mock('@/shared/lib/trace-field-renderer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/trace-field-renderer')>()),
  createTraceFieldRenderer: rendererMocks.create,
  readTraceFieldPalette: rendererMocks.palette,
}));

const PALETTE: TraceFieldPalette = {
  background: [0.05, 0.05, 0.05],
  line: [0.6, 0.6, 0.65],
  accent: [0.23, 0.51, 0.96],
};

const FRAME_ID = 7;

class FakeIntersectionObserver {
  static latest: FakeIntersectionObserver | null = null;
  private readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void;

  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    this.callback = callback;
    FakeIntersectionObserver.latest = this;
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  show(isIntersecting: boolean) {
    this.callback([{ isIntersecting }]);
  }
}

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function box(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  };
}

function fakeRenderer() {
  return { resize: vi.fn(), draw: vi.fn(), dispose: vi.fn() } satisfies TraceFieldRenderer;
}

function renderField() {
  return render(
    <section>
      <div data-slot="ambient-field">
        <TraceField focusX={0.7} focusY={0.5} compactFocusX={0.6} compactFocusY={0.9} intensity={1} />
      </div>
      <div data-field-clear />
    </section>,
  );
}

function canvas() {
  return document.querySelector('[data-slot="trace-field"]');
}

function scrollIntoView(visible = true) {
  act(() => FakeIntersectionObserver.latest?.show(visible));
}

describe('TraceField', () => {
  beforeEach(() => {
    motionState.reduce = false;
    rendererMocks.create.mockReset();
    rendererMocks.palette.mockReset().mockReturnValue(PALETTE);
    FakeIntersectionObserver.latest = null;
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => FRAME_ID));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.hasAttribute('data-field-clear') ? box(100, 200, 400, 150) : box(0, 0, 800, 600);
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, 'hidden');
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('waits until the hero is on screen before creating a WebGL context', () => {
    rendererMocks.create.mockReturnValue(fakeRenderer());
    renderField();
    expect(rendererMocks.create).not.toHaveBeenCalled();

    scrollIntoView();
    expect(rendererMocks.create).toHaveBeenCalledTimes(1);
  });

  it('leaves the CSS fallback in place when WebGL cannot start', () => {
    rendererMocks.create.mockReturnValue(null);
    renderField();
    scrollIntoView();

    expect(canvas()).toHaveAttribute('data-state', 'unavailable');
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('draws one still frame and never loops when reduced motion is on', () => {
    motionState.reduce = true;
    const renderer = fakeRenderer();
    rendererMocks.create.mockReturnValue(renderer);
    renderField();
    scrollIntoView();

    expect(canvas()).toHaveAttribute('data-state', 'still');
    expect(renderer.draw).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('animates only while the hero is visible', () => {
    rendererMocks.create.mockReturnValue(fakeRenderer());
    renderField();
    scrollIntoView();

    expect(canvas()).toHaveAttribute('data-state', 'running');
    expect(requestAnimationFrame).toHaveBeenCalled();

    scrollIntoView(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(FRAME_ID);
    expect(canvas()).toHaveAttribute('data-state', 'paused');
  });

  it('pauses while the tab is hidden', () => {
    rendererMocks.create.mockReturnValue(fakeRenderer());
    renderField();
    scrollIntoView();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(cancelAnimationFrame).toHaveBeenCalledWith(FRAME_ID);
    expect(canvas()).toHaveAttribute('data-state', 'paused');
  });

  it('keeps the traces away from the copy marked data-field-clear', () => {
    const renderer = fakeRenderer();
    rendererMocks.create.mockReturnValue(renderer);
    renderField();
    scrollIntoView();

    expect(renderer.draw).toHaveBeenLastCalledWith(
      expect.anything(),
      PALETTE,
      expect.objectContaining({ clear: [100, 200, 500, 350], heightScale: 1 }),
    );
  });

  it('releases the WebGL context when the hero unmounts', () => {
    const renderer = fakeRenderer();
    rendererMocks.create.mockReturnValue(renderer);
    const { unmount } = renderField();
    scrollIntoView();

    unmount();
    expect(renderer.dispose).toHaveBeenCalledWith(true);
  });
});
