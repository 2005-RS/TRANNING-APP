import type {
  AdminDashboardGetSystemPeriodDays,
  ClientsListExperienceLevel,
  ClientsListPrimaryGoal,
  ClientsListStatus,
  ExercisesListDifficultyLevel,
  ExercisesListEquipmentType,
  ExercisesListPrimaryMuscleGroup,
  ExercisesListStatus,
  NutritionFoodsListStatus,
  TrainersListStatus,
} from '@/generated/models';

export const PAGE_SIZE = 10;

const STATUSES = new Set(['ACTIVE', 'DISABLED']);
const CATALOG_STATUSES = new Set(['ACTIVE', 'ARCHIVED']);
const GOALS = new Set(['FAT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'GENERAL_FITNESS', 'MAINTENANCE', 'OTHER']);
const EXPERIENCE = new Set(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
const MUSCLES = new Set([
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

function parsePage(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? Number(value) : value;
  return typeof raw === 'number' && Number.isInteger(raw) && raw > 1 ? raw : undefined;
}

function parseSearch(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().slice(0, 100) : undefined;
}

function parseSet<T extends string>(value: unknown, allowed: Set<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : undefined;
}

export type AdminDashboardSearch = { periodDays?: AdminDashboardGetSystemPeriodDays };

export function validateAdminDashboardSearch(search: Record<string, unknown>): AdminDashboardSearch {
  const raw = typeof search.periodDays === 'string' ? Number(search.periodDays) : search.periodDays;
  return raw === 7 || raw === 30 || raw === 90 ? { periodDays: raw } : {};
}

export type AdminPeopleSearch = {
  page?: number;
  search?: string;
  status?: ClientsListStatus | TrainersListStatus;
};

export function validateAdminPeopleSearch(search: Record<string, unknown>): AdminPeopleSearch {
  return {
    page: parsePage(search.page),
    search: parseSearch(search.search),
    status: parseSet(search.status, STATUSES),
  };
}

export type AdminClientsSearch = AdminPeopleSearch & {
  primaryGoal?: ClientsListPrimaryGoal;
  experienceLevel?: ClientsListExperienceLevel;
};

export function validateAdminClientsSearch(search: Record<string, unknown>): AdminClientsSearch {
  return {
    ...validateAdminPeopleSearch(search),
    primaryGoal: parseSet(search.primaryGoal, GOALS),
    experienceLevel: parseSet(search.experienceLevel, EXPERIENCE),
  };
}

export type AdminCatalogSearch = {
  page?: number;
  search?: string;
  status?: ExercisesListStatus | NutritionFoodsListStatus;
};

export function validateAdminCatalogSearch(search: Record<string, unknown>): AdminCatalogSearch {
  return {
    page: parsePage(search.page),
    search: parseSearch(search.search),
    status: parseSet(search.status, CATALOG_STATUSES),
  };
}

export type AdminExercisesSearch = AdminCatalogSearch & {
  primaryMuscleGroup?: ExercisesListPrimaryMuscleGroup;
  equipmentType?: ExercisesListEquipmentType;
  difficultyLevel?: ExercisesListDifficultyLevel;
};

export function validateAdminExercisesSearch(search: Record<string, unknown>): AdminExercisesSearch {
  return {
    ...validateAdminCatalogSearch(search),
    primaryMuscleGroup: parseSet(search.primaryMuscleGroup, MUSCLES),
    equipmentType: parseSet(search.equipmentType, EQUIPMENT),
    difficultyLevel: parseSet(search.difficultyLevel, EXPERIENCE),
  };
}
