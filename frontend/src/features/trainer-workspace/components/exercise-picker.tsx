import { useEffect, useState } from 'react';
import { ExercisesListStatus, type ExerciseResponseDto } from '@/generated/models';
import { useExercisesList } from '@/generated/exercises/exercises';
import { ExerciseDemoPlayer } from '@/features/exercise-demo/exercise-demo-player';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { enumLabel } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

export function ExercisePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (exercise: ExerciseResponseDto) => void;
}) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.templates;
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const query = useExercisesList(
    {
      page: 1,
      limit: TRAINER_LIST_PAGE_SIZE,
      search,
      status: ExercisesListStatus.ACTIVE,
    },
    { query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = draft.trim();
      setSearch(next.length > 0 ? next : undefined);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft]);

  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="exercise-picker-search">{copy.searchExercises}</Label>
        <Input
          id="exercise-picker-search"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.searchExercisesPlaceholder}
          maxLength={100}
          autoComplete="off"
        />
      </div>
      {query.isPending ? (
        <p className="text-sm text-muted-foreground">{trainerWorkspaceCopy.exercises.loadingLabel}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.noExerciseMatches}</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {rows.map((exercise) => {
            const selected = exercise.id === selectedId;
            return (
              <li key={exercise.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    'h-auto w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left',
                    selected && 'bg-muted',
                  )}
                  aria-pressed={selected}
                  onPointerEnter={() => setPreviewId(exercise.id)}
                  onPointerLeave={() =>
                    setPreviewId((current) => (current === exercise.id ? null : current))
                  }
                  onFocus={() => setPreviewId(exercise.id)}
                  onClick={() => onSelect(exercise)}
                >
                  <ExerciseDemoPlayer
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    loadCatalogMedia
                    variant="thumb"
                    playback="hover"
                    forceActive={previewId === exercise.id}
                    interactive={false}
                    className="pointer-events-none size-14 shrink-0"
                    labels={{
                      play: copy.playDemo,
                      pause: copy.pauseDemo,
                      loading: copy.mediaLoading,
                      empty: copy.mediaEmpty,
                      failed: copy.mediaFailed,
                      retry: copy.mediaRetry,
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{exercise.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {enumLabel('muscle', exercise.primaryMuscleGroup)} · {enumLabel('equipment', exercise.equipmentType)}
                    </span>
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
