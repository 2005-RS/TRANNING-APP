import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTrainingAssistantCopy } from '@/features/training-assistant/copy';
import { cn } from '@/shared/lib/utils';

const TrainingAssistantPanel = lazy(() =>
  import('@/features/training-assistant/components/training-assistant-panel').then((module) => ({
    default: module.TrainingAssistantPanel,
  })),
);

/**
 * `client` / `productivity`: signed-in shells (member namespace, access token).
 * `public`: public website and sign-in page (anonymous namespace, no credentials).
 */
export type TrainingAssistantPlacement = 'client' | 'productivity' | 'public';

/**
 * Floating launcher. The panel (and socket.io-client) load on first open and
 * stay mounted afterwards so the conversation survives closing the panel.
 */
export function TrainingAssistant({
  placement,
  hidden = false,
}: {
  placement: TrainingAssistantPlacement;
  hidden?: boolean;
}) {
  const copy = useTrainingAssistantCopy();
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (hidden) {
      setOpen(false);
    }
  }, [hidden]);

  useEffect(() => {
    if (wasOpenRef.current && !open && !hidden) {
      launcherRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [hidden, open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        aria-label={copy.launcherLabel}
        aria-haspopup="dialog"
        hidden={open || hidden}
        onClick={() => {
          setActivated(true);
          setOpen(true);
        }}
        className={cn(
          'fixed right-4 z-[var(--z-sticky)] inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-semibold text-card-foreground shadow-lg transition-colors',
          'hover:bg-muted sm:px-4',
          placement === 'client'
            ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom))]'
            : 'bottom-6 sm:right-6',
          (open || hidden) && 'hidden',
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MessageCircle className="size-4" aria-hidden />
        </span>
        <span className="hidden sm:inline">{copy.name}</span>
      </button>
      {activated ? (
        <Suspense fallback={null}>
          <TrainingAssistantPanel open={open} onClose={() => setOpen(false)} placement={placement} />
        </Suspense>
      ) : null}
    </>
  );
}
