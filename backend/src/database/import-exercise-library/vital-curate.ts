import { ExerciseMuscleGroup } from '../../modules/exercises/enums/exercise-muscle-group.enum';
import { MappedVitalExercise } from './vital-types';

export const IMPORT_MAX_EXERCISES = 150;

const PRIORITY_PATTERNS: RegExp[] = [
  /bench press/i,
  /incline.*press/i,
  /cable fly|chest fly/i,
  /push.?up/i,
  /lat pulldown|pulldown/i,
  /pull.?up/i,
  /barbell row|bent.?over row/i,
  /seated.*row|cable row/i,
  /deadlift/i,
  /back squat|squat/i,
  /leg press/i,
  /romanian|rdl/i,
  /leg curl/i,
  /leg extension/i,
  /overhead press|shoulder press/i,
  /lateral raise/i,
  /barbell curl/i,
  /hammer curl/i,
  /pushdown|triceps pushdown/i,
  /skull.?crusher/i,
  /hip thrust/i,
  /bulgarian|split squat/i,
  /plank/i,
  /crunch/i,
  /lunge/i,
  /calf raise/i,
  /face pull/i,
  /dip/i,
];

export function gymUsefulnessScore(exercise: MappedVitalExercise): number {
  let score = 0;
  for (const [index, pattern] of PRIORITY_PATTERNS.entries()) {
    if (pattern.test(exercise.name)) {
      score += 100 - index;
    }
  }
  if (exercise.animationPath) {
    score += 20;
  }
  if (exercise.primaryMuscleGroup !== ExerciseMuscleGroup.OTHER) {
    score += 5;
  }
  return score;
}

export function curateVitalExercises(
  exercises: MappedVitalExercise[],
  limit = IMPORT_MAX_EXERCISES,
): MappedVitalExercise[] {
  const seen = new Set<string>();
  const unique: MappedVitalExercise[] = [];
  for (const exercise of exercises) {
    if (exercise.skippedReason) {
      continue;
    }
    const key = exercise.name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(exercise);
  }

  return unique
    .sort((left, right) => {
      const scoreDelta = gymUsefulnessScore(right) - gymUsefulnessScore(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}

export function summarizeCategories(
  exercises: MappedVitalExercise[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const exercise of exercises) {
    counts[exercise.primaryMuscleGroup] =
      (counts[exercise.primaryMuscleGroup] ?? 0) + 1;
  }
  return counts;
}
