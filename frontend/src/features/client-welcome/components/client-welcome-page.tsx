import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useClientWorkoutLibraryList } from '@/generated/client-workout-library/client-workout-library';
import { useClientTrainingPlansCreateSelf } from '@/generated/client-training-plans/client-training-plans';
import type { TrainingPlanResponseDto } from '@/generated/models';
import { Button } from '@/shared/ui/button';
import { PageContainer } from '@/shared/ui/page';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { useClientWelcomeCopy } from '@/features/client-welcome/copy';
import { useWorkoutSessionMutations } from '@/features/workout-session/hooks/use-workout-session';

export function ClientWelcomePage() {
  const copy = useClientWelcomeCopy();
  const navigate = useNavigate({ from: '/client/welcome' });
  const { user } = useAuthSession();
  const library = useClientWorkoutLibraryList();
  const createPlan = useClientTrainingPlansCreateSelf();
  const { start } = useWorkoutSessionMutations();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<TrainingPlanResponseDto | null>(null);
  const [error, setError] = useState(false);

  async function chooseRoutine(workoutTemplateId: string) {
    setError(false);
    try {
      const nextPlan = await createPlan.mutateAsync({
        data: { workouts: [{ workoutTemplateId }] },
      });
      setPlan(nextPlan);
      setStep(3);
    } catch {
      setError(true);
    }
  }

  async function startWorkout() {
    const workout = plan?.workouts[0];
    if (!workout) {
      return;
    }
    const session = await start.mutateAsync({ data: { trainingPlanWorkoutId: workout.id } });
    await navigate({ to: '/client/workout/$sessionId', params: { sessionId: session.id } });
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{copy.progress(step)}</span>
        <Button variant="ghost" onClick={() => void navigate({ to: '/client/dashboard' })}>
          {copy.skip}
        </Button>
      </div>
      {step === 1 ? (
        <section className="client-surface-card space-y-5">
          <h1 className="text-3xl font-semibold">
            {copy.welcome.replace('{{name}}', user?.firstName ?? '')}
          </h1>
          <p className="text-muted-foreground">{copy.value}</p>
          <Button className="min-h-12 w-full" onClick={() => setStep(2)}>{copy.next}</Button>
        </section>
      ) : null}
      {step === 2 ? (
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold">{copy.choose}</h1>
          {library.isPending ? <p>{copy.loading}</p> : null}
          {!library.isPending && !(library.data ?? []).length ? (
            <p>{copy.empty}</p>
          ) : null}
          {(library.data ?? []).map((routine) => (
            <article key={routine.id} className="client-surface-card space-y-3">
              <h2 className="text-lg font-semibold">{routine.name}</h2>
              {routine.description ? (
                <p className="text-sm text-muted-foreground">{routine.description}</p>
              ) : null}
              <Button
                className="min-h-12 w-full"
                disabled={createPlan.isPending}
                onClick={() => void chooseRoutine(routine.id)}
              >
                {copy.useRoutine}
              </Button>
            </article>
          ))}
          {error ? <p className="text-sm text-danger">{copy.failed}</p> : null}
        </section>
      ) : null}
      {step === 3 ? (
        <section className="client-surface-card space-y-5">
          <h1 className="text-3xl font-semibold">{copy.ready}</h1>
          <p className="text-muted-foreground">{copy.readyBody}</p>
          <Button
            className="min-h-12 w-full"
            disabled={start.isPending}
            onClick={() => void startWorkout()}
          >
            {copy.start}
          </Button>
          <Button
            variant="outline"
            className="min-h-12 w-full"
            onClick={() => void navigate({ to: '/client/dashboard' })}
          >
            {copy.home}
          </Button>
        </section>
      ) : null}
    </PageContainer>
  );
}
