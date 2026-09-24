import { ChevronDown, ChevronUp } from 'lucide-react';
import type { WorkoutTemplateExerciseResponseDto } from '@/generated/models';
import { ExerciseMediaThumb } from '@/features/trainer-workspace/components/exercise-media-thumb';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatPrescriptionScan } from '@/features/trainer-workspace/lib/prescription';
import { enumLabel } from '@/features/trainer-workspace/lib/formatters';
import { Button } from '@/shared/ui/button';

const copy = trainerWorkspaceCopy.templates;

export function TemplateExerciseRow({
  item,
  index,
  total,
  canEdit,
  pending,
  onEdit,
  onMove,
}: {
  item: WorkoutTemplateExerciseResponseDto;
  index: number;
  total: number;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="w-6 shrink-0 pt-1 font-mono text-xs tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
        <ExerciseMediaThumb exerciseId={item.exercise.id} name={item.exercise.name} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-medium text-foreground">{item.exercise.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {enumLabel('muscle', item.exercise.primaryMuscleGroup)} · {enumLabel('equipment', item.exercise.equipmentType)}
          </p>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {formatPrescriptionScan(item)}
          </p>
          {item.notes ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{item.notes}</p>
          ) : null}
        </div>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 items-center justify-end gap-1 sm:pt-0.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.moveUp}
            disabled={pending || index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.moveDown}
            disabled={pending || index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
          <Button variant="outline" disabled={pending} onClick={onEdit}>
            {copy.editExercise}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
