import { TrainerDashboardGetMineInactivityDays } from '@/generated/models';
import {
  DEFAULT_PROGRESS_PERIOD,
  parseProgressPeriod,
  type ProgressPeriod,
} from '@/features/client-progress/lib/period';

export type BooleanFilter = boolean | undefined;

function parseBooleanFilter(value: unknown): BooleanFilter {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return undefined;
}

function parsePage(value: unknown): number {
  const raw = typeof value === 'string' ? Number(value) : value;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1) {
    return raw;
  }
  return 1;
}

function parseSearchText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 100) : undefined;
}

const INACTIVITY = [7, 14, 30] as const;

function parseInactivity(value: unknown): TrainerDashboardGetMineInactivityDays | undefined {
  const raw = typeof value === 'string' ? Number(value) : value;
  if (raw === 7 || raw === 14 || raw === 30) {
    return raw as TrainerDashboardGetMineInactivityDays;
  }
  return undefined;
}

export type ClientsSearch = {
  page?: number;
  search?: string;
  hasActiveTrainingPlan?: boolean;
  hasActiveNutritionPlan?: boolean;
  hasPendingCheckIn?: boolean;
  inactivityDays?: TrainerDashboardGetMineInactivityDays;
};

export function validateClientsSearch(search: Record<string, unknown>): ClientsSearch {
  const page = parsePage(search.page);
  return {
    ...(page > 1 ? { page } : {}),
    search: parseSearchText(search.search),
    hasActiveTrainingPlan: parseBooleanFilter(search.hasActiveTrainingPlan),
    hasActiveNutritionPlan: parseBooleanFilter(search.hasActiveNutritionPlan),
    hasPendingCheckIn: parseBooleanFilter(search.hasPendingCheckIn),
    inactivityDays: parseInactivity(search.inactivityDays),
  };
}

export type DashboardSearch = {
  inactivityDays?: TrainerDashboardGetMineInactivityDays;
};

export function validateDashboardSearch(search: Record<string, unknown>): DashboardSearch {
  const inactivityDays = parseInactivity(search.inactivityDays);
  return inactivityDays ? { inactivityDays } : {};
}

export type ProgressSearch = {
  period?: ProgressPeriod;
};

export function validateTrainerProgressSearch(search: Record<string, unknown>): ProgressSearch {
  const period = parseProgressPeriod(search.period);
  return period === DEFAULT_PROGRESS_PERIOD && search.period == null ? {} : { period };
}

export type ListSearch = {
  page?: number;
  search?: string;
  status?: string;
};

export function validateListSearch(search: Record<string, unknown>): ListSearch {
  const page = parsePage(search.page);
  return {
    ...(page > 1 ? { page } : {}),
    search: parseSearchText(search.search),
    status: typeof search.status === 'string' && search.status.length > 0 ? search.status : undefined,
  };
}

const MUSCLE = new Set([
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'CORE',
  'FULL_BODY',
  'CARDIO',
  'OTHER',
]);

const EQUIPMENT = new Set([
  'BODYWEIGHT',
  'BARBELL',
  'DUMBBELL',
  'MACHINE',
  'CABLE',
  'KETTLEBELL',
  'RESISTANCE_BAND',
  'EZ_BAR',
  'TRAP_BAR',
  'CARDIO_MACHINE',
  'OTHER',
]);

const DIFFICULTY = new Set(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export type ExercisesSearch = {
  page?: number;
  search?: string;
  primaryMuscleGroup?: string;
  equipmentType?: string;
  difficultyLevel?: string;
  status?: string;
};

export function validateExercisesSearch(search: Record<string, unknown>): ExercisesSearch {
  const page = parsePage(search.page);
  const muscle =
    typeof search.primaryMuscleGroup === 'string' && MUSCLE.has(search.primaryMuscleGroup)
      ? search.primaryMuscleGroup
      : undefined;
  const equipment =
    typeof search.equipmentType === 'string' && EQUIPMENT.has(search.equipmentType)
      ? search.equipmentType
      : undefined;
  const difficulty =
    typeof search.difficultyLevel === 'string' && DIFFICULTY.has(search.difficultyLevel)
      ? search.difficultyLevel
      : undefined;
  const status =
    search.status === 'ACTIVE' || search.status === 'ARCHIVED' ? search.status : undefined;
  return {
    ...(page > 1 ? { page } : {}),
    search: parseSearchText(search.search),
    primaryMuscleGroup: muscle,
    equipmentType: equipment,
    difficultyLevel: difficulty,
    status,
  };
}

export { INACTIVITY };
