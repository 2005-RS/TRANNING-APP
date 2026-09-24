import { useParams } from '@tanstack/react-router';

export function useTrainerClientId(): string {
  const params = useParams({ strict: false });
  return typeof params.clientId === 'string' ? params.clientId : '';
}

export function useTrainerRouteId(param: 'planId' | 'checkInId' | 'templateId' | 'exerciseId'): string {
  const params = useParams({ strict: false }) as Record<string, string | undefined>;
  const value = params[param];
  return typeof value === 'string' ? value : '';
}
