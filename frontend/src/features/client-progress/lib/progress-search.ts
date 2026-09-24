import {
  DEFAULT_PROGRESS_PERIOD,
  parseProgressPeriod,
  type ProgressPeriod,
} from '@/features/client-progress/lib/period';

export type ProgressSearch = {
  period: ProgressPeriod;
};

export function validateProgressSearch(search: Record<string, unknown>): ProgressSearch {
  return {
    period: parseProgressPeriod(search.period),
  };
}

export const defaultProgressSearch: ProgressSearch = {
  period: DEFAULT_PROGRESS_PERIOD,
};
