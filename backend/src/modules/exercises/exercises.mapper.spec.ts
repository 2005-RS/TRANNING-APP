import { ExerciseDifficultyLevel } from './enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from './enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from './enums/exercise-muscle-group.enum';
import { ExerciseStatus } from './enums/exercise-status.enum';
import { Exercise } from './entities/exercise.entity';
import { toExerciseResponse } from './exercises.mapper';

describe('toExerciseResponse', () => {
  it('maps catalog fields and omits user relations', () => {
    const mapped = toExerciseResponse({
      id: 'ex-1',
      name: 'Barbell Bench Press',
      description: 'Horizontal press',
      instructions: 'Lower to chest.\nPress up.',
      primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
      equipmentType: ExerciseEquipmentType.BARBELL,
      difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      status: ExerciseStatus.ACTIVE,
      createdByUserId: 'user-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as Exercise);

    expect(mapped.createdByUserId).toBe('user-1');
    expect(mapped).not.toHaveProperty('createdByUser');
    expect(JSON.stringify(mapped)).not.toContain('passwordHash');
  });
});
