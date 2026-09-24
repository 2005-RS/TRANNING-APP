import { ExerciseDifficultyLevel } from '../exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../exercises/enums/exercise-muscle-group.enum';
import { ExerciseStatus } from '../exercises/enums/exercise-status.enum';
import { WorkoutPrescriptionType } from './enums/workout-prescription-type.enum';
import { WorkoutTemplateStatus } from './enums/workout-template-status.enum';
import { WorkoutTemplate } from './entities/workout-template.entity';
import { toWorkoutTemplateResponse } from './workout-templates.mapper';

describe('toWorkoutTemplateResponse', () => {
  it('maps ordered items, numeric RPE, and omits user/media relations', () => {
    const mapped = toWorkoutTemplateResponse({
      id: 'tpl-1',
      name: 'Push Day',
      description: 'Upper pressing',
      status: WorkoutTemplateStatus.ACTIVE,
      createdByUserId: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      items: [
        {
          id: 'item-2',
          position: 2,
          sets: 3,
          prescriptionType: WorkoutPrescriptionType.DURATION,
          repsMin: null,
          repsMax: null,
          durationSeconds: 45,
          restSeconds: 60,
          targetRpe: null,
          targetRir: null,
          tempo: null,
          notes: null,
          exercise: {
            id: 'ex-2',
            name: 'Plank',
            primaryMuscleGroup: ExerciseMuscleGroup.CORE,
            equipmentType: ExerciseEquipmentType.BODYWEIGHT,
            difficultyLevel: ExerciseDifficultyLevel.BEGINNER,
            status: ExerciseStatus.ACTIVE,
          },
        },
        {
          id: 'item-1',
          position: 1,
          sets: 4,
          prescriptionType: WorkoutPrescriptionType.REPS,
          repsMin: 8,
          repsMax: 10,
          durationSeconds: null,
          restSeconds: 120,
          targetRpe: '8.5' as unknown as number,
          targetRir: null,
          tempo: '3-1-1-0',
          notes: 'Pause briefly at the bottom.',
          exercise: {
            id: 'ex-1',
            name: 'Barbell Bench Press',
            primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
            equipmentType: ExerciseEquipmentType.BARBELL,
            difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
            status: ExerciseStatus.ACTIVE,
          },
        },
      ],
    } as WorkoutTemplate);

    expect(mapped.items.map((item) => item.exercise.id)).toEqual([
      'ex-1',
      'ex-2',
    ]);
    expect(mapped.items[0].targetRpe).toBe(8.5);
    expect(mapped.createdByUserId).toBe('user-1');
    expect(mapped).not.toHaveProperty('createdByUser');
    expect(JSON.stringify(mapped)).not.toContain('passwordHash');
    expect(JSON.stringify(mapped)).not.toContain('storageKey');
  });

  it('returns an empty items array when none are loaded', () => {
    const mapped = toWorkoutTemplateResponse({
      id: 'tpl-1',
      name: 'Push Day',
      description: null,
      status: WorkoutTemplateStatus.DRAFT,
      createdByUserId: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as WorkoutTemplate);

    expect(mapped.items).toEqual([]);
  });
});
