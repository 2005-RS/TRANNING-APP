import type { QueryClient } from '@tanstack/react-query';

function invalidatePrefix(queryClient: QueryClient, prefix: string) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith(prefix);
    },
  });
}

/** Trainer mutations must not touch Client `/clients/me` keys. */
export function invalidateTrainerDashboard(queryClient: QueryClient) {
  return Promise.all([
    invalidatePrefix(queryClient, '/api/v1/trainers/me/dashboard'),
    invalidatePrefix(queryClient, '/api/v1/trainers/me/reports/clients'),
    invalidatePrefix(queryClient, '/api/v1/trainers/me/clients'),
  ]);
}

export function invalidateTrainerClient(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    invalidatePrefix(queryClient, `/api/v1/trainers/me/clients/${clientId}`),
    invalidateTrainerDashboard(queryClient),
  ]);
}

export function invalidateTrainerTraining(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    invalidatePrefix(queryClient, `/api/v1/clients/${clientId}/training-plans`),
    invalidateTrainerDashboard(queryClient),
  ]);
}

export function invalidateTrainerNutrition(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    invalidatePrefix(queryClient, `/api/v1/clients/${clientId}/nutrition-plans`),
    invalidateTrainerDashboard(queryClient),
  ]);
}

export function invalidateTrainerCheckIns(queryClient: QueryClient, clientId: string) {
  return Promise.all([
    invalidatePrefix(queryClient, `/api/v1/clients/${clientId}/check-ins`),
    invalidateTrainerDashboard(queryClient),
  ]);
}

export function invalidateTrainerTemplates(queryClient: QueryClient) {
  return invalidatePrefix(queryClient, '/api/v1/workout-templates');
}

export function invalidateTrainerExercises(queryClient: QueryClient) {
  return invalidatePrefix(queryClient, '/api/v1/exercises');
}

export function invalidateTrainerFoods(queryClient: QueryClient) {
  return invalidatePrefix(queryClient, '/api/v1/nutrition/foods');
}
