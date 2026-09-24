import { ExerciseDifficultyLevel } from '../../modules/exercises/enums/exercise-difficulty-level.enum';
import { ExerciseEquipmentType } from '../../modules/exercises/enums/exercise-equipment-type.enum';
import { ExerciseMuscleGroup } from '../../modules/exercises/enums/exercise-muscle-group.enum';
import {
  EXERCISE_DESCRIPTION_MAX_LENGTH,
  EXERCISE_INSTRUCTIONS_MAX_LENGTH,
  EXERCISE_NAME_MAX_LENGTH,
  EXERCISE_NAME_MIN_LENGTH,
} from '../../modules/exercises/exercises.constants';
import { normalizeExerciseName } from '../../modules/exercises/exercise-text.util';
import { MappedVitalExercise, VitalExerciseRecord } from './vital-types';

const MUSCLE_ALIASES: Array<[RegExp, ExerciseMuscleGroup]> = [
  [
    /treadmill|elliptical|cycling|air bike|rowing|stepmill|cardio|aerobic/i,
    ExerciseMuscleGroup.CARDIO,
  ],
  [
    /leg curl|hamstring|romanian|stiff.?legged/i,
    ExerciseMuscleGroup.HAMSTRINGS,
  ],
  [/chest|pectoral/i, ExerciseMuscleGroup.CHEST],
  [
    /lat|upper back|lower back|trapezius|trap(?! bar)|rhomboid|back/i,
    ExerciseMuscleGroup.BACK,
  ],
  [/shoulder|delt/i, ExerciseMuscleGroup.SHOULDERS],
  [/bicep/i, ExerciseMuscleGroup.BICEPS],
  [/tricep/i, ExerciseMuscleGroup.TRICEPS],
  [/forearm|wrist/i, ExerciseMuscleGroup.FOREARMS],
  [/quad|thigh(?! ham)/i, ExerciseMuscleGroup.QUADRICEPS],
  [/glute|hip/i, ExerciseMuscleGroup.GLUTES],
  [/calf|calves/i, ExerciseMuscleGroup.CALVES],
  [/ab(?!duction)|core|waist|oblique|abs/i, ExerciseMuscleGroup.CORE],
  [/full.?body|olympic|powerlift/i, ExerciseMuscleGroup.FULL_BODY],
];

const EQUIPMENT_ALIASES: Array<[RegExp, ExerciseEquipmentType]> = [
  [
    /treadmill|elliptical|bike|rower|stepmill|cardio machine/i,
    ExerciseEquipmentType.CARDIO_MACHINE,
  ],
  [/barbell|ez.?bar/i, ExerciseEquipmentType.BARBELL],
  [/dumbbell/i, ExerciseEquipmentType.DUMBBELL],
  [/cable|pulley/i, ExerciseEquipmentType.CABLE],
  [/kettlebell/i, ExerciseEquipmentType.KETTLEBELL],
  [/band|resistance/i, ExerciseEquipmentType.RESISTANCE_BAND],
  [/trap.?bar|hex.?bar/i, ExerciseEquipmentType.TRAP_BAR],
  [/smith|leverage|machine|sled/i, ExerciseEquipmentType.MACHINE],
  [/body.?weight|none|assisted|stretch/i, ExerciseEquipmentType.BODYWEIGHT],
];

export function mapVitalMuscle(
  record: VitalExerciseRecord,
): ExerciseMuscleGroup {
  const haystack = [
    record.name,
    record.target,
    record.bodyPart,
    record.category,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  for (const [pattern, muscle] of MUSCLE_ALIASES) {
    if (pattern.test(haystack)) {
      return muscle;
    }
  }
  return ExerciseMuscleGroup.OTHER;
}

export function mapVitalEquipment(
  record: VitalExerciseRecord,
): ExerciseEquipmentType {
  const value = record.equipment ?? '';
  if (/ez/i.test(value)) {
    return ExerciseEquipmentType.EZ_BAR;
  }
  for (const [pattern, equipment] of EQUIPMENT_ALIASES) {
    if (pattern.test(value)) {
      return equipment;
    }
  }
  return ExerciseEquipmentType.OTHER;
}

export function mapVitalDifficulty(
  record: VitalExerciseRecord,
): ExerciseDifficultyLevel {
  const value = (record.difficulty ?? '').toLowerCase();
  if (value.includes('beginner') || value.includes('easy')) {
    return ExerciseDifficultyLevel.BEGINNER;
  }
  if (
    value.includes('advanced') ||
    value.includes('expert') ||
    value.includes('hard')
  ) {
    return ExerciseDifficultyLevel.ADVANCED;
  }
  return ExerciseDifficultyLevel.INTERMEDIATE;
}

export function flattenInstructions(
  value: string[] | string | undefined,
): string | null {
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .join('\n');
    return joined.length > 0
      ? joined.slice(0, EXERCISE_INSTRUCTIONS_MAX_LENGTH)
      : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0
      ? trimmed.slice(0, EXERCISE_INSTRUCTIONS_MAX_LENGTH)
      : null;
  }
  return null;
}

export function sourceIdFor(
  record: VitalExerciseRecord,
  index: number,
): string {
  const raw = record.exerciseId ?? record.id;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  return `vital-${index + 1}`;
}

export function mapVitalRecord(
  record: VitalExerciseRecord,
  index: number,
  animationPath: string | null,
): MappedVitalExercise {
  const name = normalizeExerciseName(record.name ?? '').slice(
    0,
    EXERCISE_NAME_MAX_LENGTH,
  );
  const description =
    typeof record.description === 'string' &&
    record.description.trim().length > 0
      ? record.description.trim().slice(0, EXERCISE_DESCRIPTION_MAX_LENGTH)
      : null;

  if (name.length < EXERCISE_NAME_MIN_LENGTH) {
    return {
      sourceId: sourceIdFor(record, index),
      name,
      description,
      instructions: flattenInstructions(record.instructions),
      primaryMuscleGroup: mapVitalMuscle(record),
      equipmentType: mapVitalEquipment(record),
      difficultyLevel: mapVitalDifficulty(record),
      animationPath,
      skippedReason: 'name too short',
    };
  }

  return {
    sourceId: sourceIdFor(record, index),
    name,
    description,
    instructions: flattenInstructions(record.instructions),
    primaryMuscleGroup: mapVitalMuscle(record),
    equipmentType: mapVitalEquipment(record),
    difficultyLevel: mapVitalDifficulty(record),
    animationPath,
  };
}

export function isVitalExerciseRecord(
  value: unknown,
): value is VitalExerciseRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as VitalExerciseRecord;
  return (
    typeof record.name === 'string' || typeof record.exerciseId === 'string'
  );
}

export function collectVitalRecords(value: unknown): VitalExerciseRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isVitalExerciseRecord);
  }
  if (typeof value === 'object' && value !== null) {
    const object = value as Record<string, unknown>;
    for (const key of ['exercises', 'data', 'items']) {
      if (Array.isArray(object[key])) {
        return object[key].filter(isVitalExerciseRecord);
      }
    }
    if (isVitalExerciseRecord(value)) {
      return [value];
    }
  }
  return [];
}
