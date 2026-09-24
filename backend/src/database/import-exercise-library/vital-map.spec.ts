import { ExerciseDifficultyLevel } from '../../modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../../modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../../modules/exercises/enums/exercise-muscle-group.enum';
import {
  collectVitalRecords,
  flattenInstructions,
  mapVitalDifficulty,
  mapVitalEquipment,
  mapVitalMuscle,
  mapVitalRecord,
} from './vital-map';

describe('vital-map', () => {
  it('maps supported metadata and truncates instructions', () => {
    const mapped = mapVitalRecord(
      {
        exerciseId: 'va-bench',
        name: '  Barbell   Bench Press ',
        bodyPart: 'chest',
        equipment: 'barbell',
        target: 'pectorals',
        difficulty: 'intermediate',
        description: 'A compound press.',
        instructions: ['Lie on the bench.', 'Press the bar.'],
      },
      0,
      '/tmp/bench.mp4',
    );

    expect(mapped).toMatchObject({
      sourceId: 'va-bench',
      name: 'Barbell Bench Press',
      primaryMuscleGroup: ExerciseMuscleGroup.CHEST,
      equipmentType: ExerciseEquipmentType.BARBELL,
      difficultyLevel: ExerciseDifficultyLevel.INTERMEDIATE,
      animationPath: '/tmp/bench.mp4',
    });
    expect(mapped.instructions).toBe('Lie on the bench.\nPress the bar.');
  });

  it('maps equipment, muscle, and difficulty aliases', () => {
    expect(mapVitalMuscle({ target: 'lats', bodyPart: 'back' })).toBe(
      ExerciseMuscleGroup.BACK,
    );
    expect(mapVitalMuscle({ bodyPart: 'waist' })).toBe(
      ExerciseMuscleGroup.CORE,
    );
    expect(
      mapVitalMuscle({
        name: 'lying leg curl machine',
        bodyPart: 'upper legs',
        target: 'quads',
      }),
    ).toBe(ExerciseMuscleGroup.HAMSTRINGS);
    expect(
      mapVitalMuscle({
        name: 'run on treadmill',
        bodyPart: 'quads',
        category: 'cardio',
      }),
    ).toBe(ExerciseMuscleGroup.CARDIO);
    expect(mapVitalEquipment({ equipment: 'elliptical hiit machine' })).toBe(
      ExerciseEquipmentType.CARDIO_MACHINE,
    );
    expect(mapVitalEquipment({ equipment: 'EZ Barbell' })).toBe(
      ExerciseEquipmentType.EZ_BAR,
    );
    expect(mapVitalEquipment({ equipment: 'cable' })).toBe(
      ExerciseEquipmentType.CABLE,
    );
    expect(mapVitalEquipment({ equipment: 'body weight' })).toBe(
      ExerciseEquipmentType.BODYWEIGHT,
    );
    expect(mapVitalDifficulty({ difficulty: 'beginner' })).toBe(
      ExerciseDifficultyLevel.BEGINNER,
    );
    expect(mapVitalDifficulty({ difficulty: 'expert' })).toBe(
      ExerciseDifficultyLevel.ADVANCED,
    );
    expect(flattenInstructions([])).toBeNull();
  });

  it('skips unnamed records and collects nested arrays', () => {
    const skipped = mapVitalRecord({ name: ' ' }, 3, null);
    expect(skipped.skippedReason).toBe('name too short');
    expect(skipped.sourceId).toBe('vital-4');
    expect(
      collectVitalRecords({
        exercises: [{ name: 'Plank' }, { foo: 1 }],
      }).map((item) => item.name),
    ).toEqual(['Plank']);
  });
});
