import { lazy, Suspense } from 'react';
import { cn } from '@/shared/lib/utils';

const TraceField = lazy(() => import('@/shared/ui/trace-field'));

/**
 * Where the ridges gather on each hero. Focus is a 0–1 point, y from the top;
 * the compact focus applies below 768px.
 */
const PRESETS = {
  home: { focusX: 0.76, focusY: 0.56, compactFocusX: 0.62, compactFocusY: 0.9, intensity: 0.95 },
  login: { focusX: 0.66, focusY: 0.48, compactFocusX: 0.66, compactFocusY: 0.48, intensity: 0.9 },
} as const;

function canUseWebGL() {
  return typeof window !== 'undefined' && typeof window.WebGLRenderingContext === 'function';
}

/**
 * Hero background for the public home and login only
 * (docs/frontend/motion-and-3d.md#ambient-trace-field). The CSS atmosphere is
 * always rendered first; the WebGL field fades in over it when available.
 */
export function AmbientField({
  preset,
  className,
}: {
  preset: keyof typeof PRESETS;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-slot="ambient-field"
      className={cn('pointer-events-none absolute inset-0', className)}
    >
      <div className="login-hero-atmosphere absolute inset-0" />
      {canUseWebGL() ? (
        <Suspense fallback={null}>
          <TraceField {...PRESETS[preset]} />
        </Suspense>
      ) : null}
    </div>
  );
}
