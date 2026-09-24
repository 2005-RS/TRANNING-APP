import { ExerciseMuscleGroup } from '../../modules/exercises/enums/exercise-muscle-group.enum';
import { curateVitalExercises, gymUsefulnessScore } from './vital-curate';
import { MappedVitalExercise } from './vital-types';

function exercise(
  name: string,
  muscle = ExerciseMuscleGroup.CHEST,
  animationPath: string | null = '/tmp/a.mp4',
): MappedVitalExercise {
  return {
    sourceId: name,
    name,
    description: null,
    instructions: null,
    primaryMuscleGroup: muscle,
    equipmentType: 'BARBELL',
    difficultyLevel: 'INTERMEDIATE',
    animationPath,
  };
}

describe('vital-curate', () => {
  it('deduplicates by name, prefers gym staples, and caps the library', () => {
    const curated = curateVitalExercises(
      [
        exercise('Barbell Bench Press'),
        exercise('barbell bench press'),
        exercise('Obscure Isolation', ExerciseMuscleGroup.OTHER, null),
        { ...exercise('A'), skippedReason: 'name too short' },
        exercise('Back Squat', ExerciseMuscleGroup.QUADRICEPS),
      ],
      2,
    );

    expect(curated.map((item) => item.name)).toEqual([
      'Barbell Bench Press',
      'Back Squat',
    ]);
    expect(gymUsefulnessScore(exercise('Barbell Bench Press'))).toBeGreaterThan(
      gymUsefulnessScore(
        exercise('Obscure Isolation', ExerciseMuscleGroup.OTHER, null),
      ),
    );
  });
});
