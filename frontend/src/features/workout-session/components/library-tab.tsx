import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useClientWorkoutLibraryList } from '@/generated/client-workout-library/client-workout-library';
import { useClientTrainingPlansCreateSelf } from '@/generated/client-training-plans/client-training-plans';
import { Button } from '@/shared/ui/button';
import { RoutineCard } from '@/features/workout-session/components/routine-card';
import { workoutCopy } from '@/features/workout-session/copy';

type LibraryTabProps = { trainerPlan: boolean };

export function LibraryTab({ trainerPlan }: LibraryTabProps) {
  const navigate = useNavigate({ from: '/client/training' });
  const library = useClientWorkoutLibraryList();
  const createPlan = useClientTrainingPlansCreateSelf();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(0, 7),
    );
  }

  async function create(ids: string[]) {
    if (trainerPlan) {
      return;
    }

    try {
      await createPlan.mutateAsync({
        data: { workouts: ids.map((workoutTemplateId) => ({ workoutTemplateId })) },
      });
      toast.success(workoutCopy.hub.routineCreated);
      await navigate({ search: { tab: 'plan' } });
    } catch {
      toast.error(workoutCopy.hub.trainerManagesPlan);
    }
  }

  if (library.isPending) {
    return <p className="text-sm text-muted-foreground">Loading routines...</p>;
  }
  if ((library.data ?? []).length === 0) {
    return <p className="text-sm text-muted-foreground">{workoutCopy.hub.libraryEmpty}</p>;
  }
  if (trainerPlan) {
    return <p className="text-sm text-muted-foreground">{workoutCopy.hub.trainerManagesPlan}</p>;
  }

  return (
    <section className="space-y-4" aria-label={workoutCopy.hub.tabs.library}>
      {(library.data ?? []).map((routine) => (
        <RoutineCard
          key={routine.id}
          routine={routine}
          selected={selected.includes(routine.id)}
          disabled={createPlan.isPending}
          onSelect={() => toggle(routine.id)}
          onUse={() => void create([routine.id])}
        />
      ))}
      <Button
        className="min-h-12 w-full"
        disabled={selected.length === 0 || createPlan.isPending}
        onClick={() => void create(selected)}
      >
        {workoutCopy.hub.createRoutine}
      </Button>
    </section>
  );
}
