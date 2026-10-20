import { useState } from 'react';
import type { WorkoutLibraryItemResponseDto } from '@/generated/models';
import { Button } from '@/shared/ui/button';
import { workoutCopy } from '@/features/workout-session/copy';

type RoutineCardProps = {
  routine: WorkoutLibraryItemResponseDto;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onUse: () => void;
};

export function RoutineCard({ routine, selected, disabled, onSelect, onUse }: RoutineCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="client-surface-card space-y-3">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{routine.name}</h3>
        {routine.description ? <p className="text-sm text-muted-foreground">{routine.description}</p> : null}
        <p className="text-sm text-muted-foreground">
          ≈ {routine.estimatedMinutes} min · {routine.exerciseCount} ejercicios
        </p>
      </div>
      <Button type="button" variant="ghost" onClick={() => setExpanded((value) => !value)}>
        {expanded ? workoutCopy.hub.hideExercises : workoutCopy.hub.showExercises}
      </Button>
      {expanded ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {routine.exercises.map((exercise) => (
            <li key={exercise.exerciseId}>
              {exercise.name} · {exercise.sets} series
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant={selected ? 'secondary' : 'outline'} disabled={disabled} onClick={onSelect}>
          {selected ? workoutCopy.hub.selectedRoutine : workoutCopy.hub.selectRoutine}
        </Button>
        <Button type="button" disabled={disabled} onClick={onUse}>
          {workoutCopy.hub.useRoutine}
        </Button>
      </div>
    </article>
  );
}
