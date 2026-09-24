import { WorkoutPrescriptionType } from '../workout-templates/enums/workout-prescription-type.enum';
import { TrainingPlanStatus } from './enums/training-plan-status.enum';
import { TrainingPlan } from './entities/training-plan.entity';
import { toTrainingPlanResponse } from './training-plans.mapper';

describe('toTrainingPlanResponse', () => {
  it('maps snapshots, numeric load/RPE, and omits live template/media relations', () => {
    const mapped = toTrainingPlanResponse({
      id: 'plan-1',
      name: 'Hypertrophy Phase 1',
      description: 'Block 1',
      status: TrainingPlanStatus.ACTIVE,
      startDate: '2026-09-07',
      endDate: null,
      clientProfileId: 'client-1',
      createdByUserId: 'trainer-a',
      activatedAt: new Date('2026-09-01T00:00:00.000Z'),
      archivedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      workouts: [
        {
          id: 'w-1',
          sourceWorkoutTemplateId: 'tpl-1',
          nameSnapshot: 'Push Day',
          descriptionSnapshot: 'Upper',
          position: 1,
          scheduledDay: 'MONDAY',
          notes: null,
          exercises: [
            {
              id: 'e-1',
              exerciseId: 'ex-1',
              exerciseNameSnapshot: 'Barbell Bench Press',
              position: 1,
              sets: 4,
              prescriptionType: WorkoutPrescriptionType.REPS,
              repsMin: 8,
              repsMax: 10,
              durationSeconds: null,
              restSeconds: 120,
              targetLoadKg: '82.50' as unknown as number,
              targetRpe: '8.5' as unknown as number,
              targetRir: null,
              tempo: null,
              notes: null,
            },
          ],
        },
      ],
    } as TrainingPlan);

    expect(mapped.startDate).toBe('2026-09-07');
    expect(mapped.workouts[0].name).toBe('Push Day');
    expect(mapped.workouts[0].exercises[0].exerciseName).toBe(
      'Barbell Bench Press',
    );
    expect(mapped.workouts[0].exercises[0].targetLoadKg).toBe(82.5);
    expect(mapped.workouts[0].exercises[0].targetRpe).toBe(8.5);
    expect(JSON.stringify(mapped)).not.toContain('passwordHash');
    expect(JSON.stringify(mapped)).not.toContain('storageKey');
    expect(JSON.stringify(mapped)).not.toContain('exerciseNameSnapshot');
  });
});
