import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  getClientNutritionJournalGetDayQueryKey,
  useClientNutritionJournalAddEntry,
  useClientNutritionJournalClear,
  useClientNutritionJournalDeleteEntry,
  useClientNutritionJournalGetDay,
  useClientNutritionJournalMarkEaten,
  useClientNutritionJournalSkip,
  useClientNutritionJournalUpdateEntry,
} from '@/generated/client-nutrition-journal/client-nutrition-journal';
import type { JournalDayResponseDto } from '@/generated/models';
/** The journal changes on every log; keep it fresh but avoid refetch storms. */
const JOURNAL_STALE_TIME_MS = 30_000;
const JOURNAL_PREFIX = '/api/v1/clients/me/nutrition-journal';
const FOODS_PREFIX = '/api/v1/clients/me/nutrition-foods';

function keyStartsWith(prefix: string) {
  return ({ queryKey }: { queryKey: readonly unknown[] }) =>
    typeof queryKey[0] === 'string' && queryKey[0].startsWith(prefix);
}

/** Journal days plus the "recent" and "in plan" food lists both depend on logs. */
export function invalidateJournal(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ predicate: keyStartsWith(JOURNAL_PREFIX) }),
    queryClient.invalidateQueries({ predicate: keyStartsWith(FOODS_PREFIX) }),
  ]).then(() => undefined);
}

export function useJournalDay(date: string) {
  return useClientNutritionJournalGetDay(date, {
    query: { staleTime: JOURNAL_STALE_TIME_MS },
  });
}

/** Prescribed-item actions return the whole day: write it straight into the cache. */
export function usePlannedItemActions(date: string) {
  const queryClient = useQueryClient();
  const onSuccess = (day: JournalDayResponseDto) => {
    queryClient.setQueryData(getClientNutritionJournalGetDayQueryKey(date), day);
    void queryClient.invalidateQueries({ predicate: keyStartsWith(FOODS_PREFIX) });
  };
  const markEaten = useClientNutritionJournalMarkEaten({ mutation: { onSuccess } });
  const skip = useClientNutritionJournalSkip({ mutation: { onSuccess } });
  const clear = useClientNutritionJournalClear({ mutation: { onSuccess } });
  return { markEaten, skip, clear };
}

export function useJournalEntryMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidateJournal(queryClient);
  const addEntry = useClientNutritionJournalAddEntry({ mutation: { onSuccess } });
  const updateEntry = useClientNutritionJournalUpdateEntry({ mutation: { onSuccess } });
  const deleteEntry = useClientNutritionJournalDeleteEntry({ mutation: { onSuccess } });
  return { addEntry, updateEntry, deleteEntry };
}
