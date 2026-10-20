import { useQueryClient } from '@tanstack/react-query';
import {
  getClientSubscriptionsMeQueryKey,
  useClientSubscriptionsMe,
  useClientSubscriptionsReport,
} from '@/generated/subscriptions/subscriptions';

export function useClientSubscription() {
  const queryClient = useQueryClient();
  const subscription = useClientSubscriptionsMe();
  const report = useClientSubscriptionsReport();

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: getClientSubscriptionsMeQueryKey() });
  }

  return { subscription, report, invalidate };
}
