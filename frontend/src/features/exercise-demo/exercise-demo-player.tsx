import { useEffect, useRef, useState } from 'react';
import { Dumbbell, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  ExerciseMediaResponseDtoMediaType,
  ExerciseMediaResponseDtoStatus,
  type ExerciseMediaResponseDto,
} from '@/generated/models';
import { useExerciseMediaList } from '@/generated/exercise-media/exercise-media';
import { useExerciseMediaAccess } from '@/features/exercise-demo/use-exercise-media-access';
import { pickReadyDemonstration, type ExerciseDemoLabels } from '@/features/exercise-demo/demo-media';
import { TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';

export type ExerciseDemoVariant = 'thumb' | 'card' | 'detail' | 'focus';
export type ExerciseDemoPlayback = 'manual' | 'hover' | 'visible' | 'current';

export function ExerciseDemoPlayer({
  exerciseId,
  exerciseName,
  media,
  loadCatalogMedia = false,
  variant,
  playback,
  labels,
  className,
  interactive = true,
  forceActive = false,
}: {
  exerciseId: string;
  exerciseName: string;
  media?: ExerciseMediaResponseDto | null;
  loadCatalogMedia?: boolean;
  variant: ExerciseDemoVariant;
  playback: ExerciseDemoPlayback;
  labels: ExerciseDemoLabels;
  className?: string;
  interactive?: boolean;
  forceActive?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const catalog = useExerciseMediaList(exerciseId, {
    query: {
      enabled: loadCatalogMedia && near && exerciseId.length > 0,
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  });
  const ready =
    media && media.status === ExerciseMediaResponseDtoStatus.READY
      ? media
      : pickReadyDemonstration(catalog.data) ?? null;
  const isVideo = ready?.mediaType === ExerciseMediaResponseDtoMediaType.VIDEO;
  const isImage = ready?.mediaType === ExerciseMediaResponseDtoMediaType.IMAGE;
  const active = hovering || forceActive;
  const wantsAutoplay =
    !reduceMotion &&
    ((playback === 'hover' && active) ||
      (playback === 'visible' && visible) ||
      playback === 'current');
  const showPrimaryPlayer = variant === 'detail' || variant === 'focus';
  const shouldLoadVideo = Boolean(
    isVideo && (playing || wantsAutoplay || variant === 'detail'),
  );
  const shouldLoadUrl = Boolean(ready && (isImage || shouldLoadVideo));
  const access = useExerciseMediaAccess(exerciseId, ready?.id ?? '', shouldLoadUrl);
  const url = access.data?.url;
  const loading = (loadCatalogMedia && catalog.isPending) || (shouldLoadUrl && access.isPending && !url);
  const isPlaying = playing || wantsAutoplay;

  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
        }
        setVisible(Boolean(entry?.isIntersecting));
      },
      { rootMargin: variant === 'thumb' || variant === 'card' ? '80px' : '0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant]);

  useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [exerciseId, ready?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url || !isVideo) {
      return;
    }
    if (playing || wantsAutoplay) {
      try {
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          void playAttempt.catch(() => {
            setPlaying(false);
          });
        }
      } catch {
        setPlaying(false);
      }
      return;
    }
    video.pause();
  }, [isVideo, playing, url, wantsAutoplay]);

  const frameClass = {
    thumb: 'size-14 rounded-md',
    card: 'aspect-video w-full rounded-lg',
    detail: 'aspect-video w-full rounded-xl',
    focus: 'aspect-video w-full rounded-xl',
  }[variant];

  return (
    <div
      ref={hostRef}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? `${exerciseName} demonstration` : undefined}
      className={cn(
        'relative overflow-hidden border border-border bg-muted',
        frameClass,
        className,
      )}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHovering(false);
        }
      }}
    >
      {!ready && loadCatalogMedia && catalog.isPending ? (
        <Skeleton className="size-full" aria-hidden />
      ) : !ready ? (
        <Placeholder label={labels.empty} />
      ) : failed || access.isError ? (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
          <p className="text-xs text-muted-foreground">{labels.failed}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFailed(false);
              void access.refetch();
            }}
          >
            {labels.retry}
          </Button>
        </div>
      ) : isImage && url ? (
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : isVideo && url && shouldLoadVideo ? (
        <video
          ref={videoRef}
          src={url}
          muted
          loop
          playsInline
          preload={variant === 'detail' || playback === 'current' ? 'metadata' : 'none'}
          controls={false}
          className={cn('size-full', showPrimaryPlayer ? 'object-contain bg-muted' : 'object-cover')}
          aria-label={`${exerciseName} demonstration`}
          onError={() => setFailed(true)}
          onPlay={() => setPlaying(true)}
          onCanPlay={() => {
            if (playing || wantsAutoplay) {
              void videoRef.current?.play().catch(() => undefined);
            }
          }}
        />
      ) : (
        <Placeholder label={ready ? `${exerciseName} demonstration` : labels.empty} />
      )}

      {interactive && ready && isVideo && !failed ? (
        <Button
          type="button"
          variant="secondary"
          size={variant === 'detail' && !isPlaying ? 'default' : 'icon'}
          className={cn(
            'absolute z-10 bg-background/90 shadow-sm',
            variant === 'detail' && !isPlaying
              ? 'inset-0 m-auto h-12 min-h-12 w-max gap-2 rounded-full px-4'
              : 'bottom-2 right-2 size-10 min-h-10 min-w-10 rounded-full',
            variant === 'thumb' && 'inset-0 size-full min-h-0 min-w-0 rounded-none bg-background/40 shadow-none',
          )}
          aria-label={isPlaying ? labels.pause : `${labels.play}: ${exerciseName}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const video = videoRef.current;
            if (!video || reduceMotion || playback === 'manual' || playback === 'hover' || !wantsAutoplay) {
              setPlaying((current) => !current);
              return;
            }
            if (video.paused) {
              void video.play();
              setPlaying(true);
              return;
            }
            video.pause();
            setPlaying(false);
          }}
        >
          {isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {variant === 'detail' && !isPlaying ? <span>{labels.play}</span> : null}
        </Button>
      ) : null}

      {loading ? (
        <div role="status" aria-label={labels.loading} className="absolute inset-0">
          <Skeleton className="size-full" />
        </div>
      ) : null}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex size-full items-center justify-center bg-muted">
      <Dumbbell className="size-6 text-muted-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
