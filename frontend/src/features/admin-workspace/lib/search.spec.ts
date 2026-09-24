import { describe, expect, it } from 'vitest';
import {
  validateAdminCatalogSearch,
  validateAdminClientsSearch,
  validateAdminDashboardSearch,
  validateAdminExercisesSearch,
  validateAdminPeopleSearch,
} from '@/features/admin-workspace/lib/search';

describe('admin search params', () => {
  it('keeps only supported dashboard periods', () => {
    expect(validateAdminDashboardSearch({ periodDays: '7' })).toEqual({ periodDays: 7 });
    expect(validateAdminDashboardSearch({ periodDays: 45 })).toEqual({});
  });

  it('normalizes people filters without trusting arbitrary status values', () => {
    expect(validateAdminPeopleSearch({ page: '2', search: '  coach  ', status: 'ACTIVE' })).toEqual({
      page: 2,
      search: 'coach',
      status: 'ACTIVE',
    });
    expect(validateAdminPeopleSearch({ page: '1', search: '', status: 'ARCHIVED' })).toEqual({
      page: undefined,
      search: undefined,
      status: undefined,
    });
  });

  it('allows client goal and experience filters from the generated enum surface only', () => {
    expect(
      validateAdminClientsSearch({
        primaryGoal: 'STRENGTH',
        experienceLevel: 'INTERMEDIATE',
      }),
    ).toMatchObject({
      primaryGoal: 'STRENGTH',
      experienceLevel: 'INTERMEDIATE',
    });
    expect(
      validateAdminClientsSearch({
        primaryGoal: 'CALORIE_LOGGING',
        experienceLevel: 'ELITE',
      }),
    ).toMatchObject({
      primaryGoal: undefined,
      experienceLevel: undefined,
    });
  });

  it('separates catalog statuses from account statuses', () => {
    expect(validateAdminCatalogSearch({ status: 'ARCHIVED' })).toEqual({
      page: undefined,
      search: undefined,
      status: 'ARCHIVED',
    });
    expect(validateAdminCatalogSearch({ status: 'DISABLED' })).toEqual({
      page: undefined,
      search: undefined,
      status: undefined,
    });
  });

  it('validates exercise catalog facets independently', () => {
    expect(
      validateAdminExercisesSearch({
        primaryMuscleGroup: 'CHEST',
        equipmentType: 'BARBELL',
        difficultyLevel: 'ADVANCED',
      }),
    ).toMatchObject({
      primaryMuscleGroup: 'CHEST',
      equipmentType: 'BARBELL',
      difficultyLevel: 'ADVANCED',
    });
    expect(
      validateAdminExercisesSearch({
        primaryMuscleGroup: 'SECRET',
        equipmentType: 'FORBIDDEN',
        difficultyLevel: 'EXPERT',
      }),
    ).toMatchObject({
      primaryMuscleGroup: undefined,
      equipmentType: undefined,
      difficultyLevel: undefined,
    });
  });
});
