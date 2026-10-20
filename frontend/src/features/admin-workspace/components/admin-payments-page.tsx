import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAdminSubscriptionsListQueryKey,
  getClientSubscriptionsGetQueryKey,
  useAdminSubscriptionsApprove,
  useAdminSubscriptionsExpired,
  useAdminSubscriptionsList,
  useAdminSubscriptionsReject,
} from '@/generated/subscriptions/subscriptions';
import type {
  AdminSubscriptionPaymentResponseDto,
  PaginatedSubscriptionPaymentsResponseDto,
} from '@/generated/models';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageScaffold,
  AdminStatusBadge,
  AdminTableSurface,
  PaginationBar,
} from '@/features/admin-workspace/components/admin-primitives';
import { ExpiredWithTrainerList } from '@/features/admin-workspace/components/expired-with-trainer-list';
import {
  PaymentReviewSheets,
  type PaymentReviewMode,
} from '@/features/admin-workspace/components/payment-review-sheets';
import { PAGE_SIZE } from '@/features/admin-workspace/lib/search';
import { formatInstantDateTime, formatNumber } from '@/i18n/format';
import { Button } from '@/shared/ui/button';

function money(value: number): string {
  return formatNumber(value, { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

function generatedString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function AdminPaymentsPage() {
  const copy = useAdminWorkspaceCopy();
  const search = useSearch({ from: '/admin/payments' });
  const navigate = useNavigate({ from: '/admin/payments' });
  const queryClient = useQueryClient();
  const list = useAdminSubscriptionsList({
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
    status: search.status,
  });
  const expired = useAdminSubscriptionsExpired({ page: 1, pageSize: PAGE_SIZE });
  const approve = useAdminSubscriptionsApprove();
  const reject = useAdminSubscriptionsReject();
  const [target, setTarget] = useState<AdminSubscriptionPaymentResponseDto | null>(null);
  const [mode, setMode] = useState<PaymentReviewMode>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(clientId: string): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getAdminSubscriptionsListQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getClientSubscriptionsGetQueryKey(clientId) }),
    ]);
  }

  function openReview(nextTarget: AdminSubscriptionPaymentResponseDto, nextMode: PaymentReviewMode): void {
    setError(null);
    setTarget(nextTarget);
    setMode(nextMode);
  }

  function closeReview(): void {
    setError(null);
    setTarget(null);
    setMode(null);
  }

  async function approvePayment(): Promise<void> {
    if (!target) return;
    setError(null);
    try {
      await approve.mutateAsync({ id: target.id });
      await refresh(target.client.id);
      closeReview();
    } catch {
      setError(copy.common.conflictBody);
    }
  }

  async function rejectPayment(reason: string): Promise<void> {
    if (!target) return;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 300) {
      setError(copy.common.checkFields);
      return;
    }
    setError(null);
    try {
      await reject.mutateAsync({ id: target.id, data: { reason: trimmedReason } });
      await refresh(target.client.id);
      closeReview();
    } catch {
      setError(copy.common.conflictBody);
    }
  }

  const tabs: Array<[typeof search.status | undefined, string]> = [
    ['PENDING', copy.payments.pending],
    ['APPROVED', copy.payments.approved],
    ['REJECTED', copy.payments.rejected],
    [undefined, copy.payments.all],
  ];

  return (
    <AdminPageScaffold title={copy.payments.title} description={copy.payments.description}>
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(([status, label], index) => {
          const selected = index === 3 ? !search.status : (search.status ?? 'PENDING') === status;
          return (
            <Button
              key={status ?? 'all'}
              role="tab"
              aria-selected={selected}
              variant={selected ? 'default' : 'outline'}
              size="sm"
              onClick={() => void navigate({ search: { status, page: undefined }, replace: true })}
            >
              {label}
            </Button>
          );
        })}
      </div>

      <PaymentsList
        pending={list.isPending}
        error={list.isError ? list.error : null}
        data={list.data}
        retrying={list.isFetching}
        onRetry={() => void list.refetch()}
        onPage={(page) => void navigate({ search: { ...search, page }, replace: true })}
        onReview={openReview}
      />

      <ExpiredWithTrainerList
        pending={expired.isPending}
        error={expired.isError ? expired.error : null}
        data={expired.data}
        retrying={expired.isFetching}
        onRetry={() => void expired.refetch()}
      />

      <PaymentReviewSheets
        target={target}
        mode={mode}
        pending={approve.isPending || reject.isPending}
        error={error}
        onClose={closeReview}
        onApprove={() => void approvePayment()}
        onReject={(reason) => void rejectPayment(reason)}
      />
    </AdminPageScaffold>
  );
}

function PaymentsList({
  pending,
  error,
  data,
  retrying,
  onRetry,
  onPage,
  onReview,
}: {
  pending: boolean;
  error: unknown;
  data: PaginatedSubscriptionPaymentsResponseDto | undefined;
  retrying: boolean;
  onRetry: () => void;
  onPage: (page: number) => void;
  onReview: (payment: AdminSubscriptionPaymentResponseDto, mode: PaymentReviewMode) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  if (pending) return <p role="status">{copy.loadingLabel}</p>;
  if (error || !data) return <AdminErrorState error={error} retrying={retrying} onRetry={onRetry} />;
  if (data.data.length === 0) {
    return <AdminEmptyState title={copy.payments.emptyTitle} body={copy.payments.emptyBody} />;
  }

  return (
    <>
      <AdminTableSurface>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-3">{copy.payments.client}</th>
              <th className="p-3">{copy.payments.amount}</th>
              <th className="p-3">{copy.payments.receipt}</th>
              <th className="p-3">{copy.common.status}</th>
              <th className="p-3">
                <span className="sr-only">{copy.common.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((payment) => (
              <tr key={payment.id} className="border-b border-border/70">
                <td className="p-3">
                  <Link
                    to="/admin/clients/$clientId"
                    params={{ clientId: payment.client.id }}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {payment.client.firstName} {payment.client.lastName}
                  </Link>
                  <span className="block text-xs text-muted-foreground">{payment.client.email}</span>
                </td>
                <td className="p-3">
                  {money(payment.amountCrc)}
                  <span className="block text-xs text-muted-foreground">{payment.paidOn}</span>
                </td>
                <td className="p-3">
                  {payment.reference}
                  <span className="block text-xs text-muted-foreground">
                    {generatedString(payment.payerPhone)}
                  </span>
                </td>
                <td className="p-3">
                  <AdminStatusBadge status={payment.status} />
                  {payment.reviewedAt ? (
                    <span className="block text-xs text-muted-foreground">
                      {formatInstantDateTime(payment.reviewedAt)} {generatedString(payment.rejectionReason)}
                    </span>
                  ) : null}
                </td>
                <td className="p-3 text-right">
                  {payment.status === 'PENDING' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => onReview(payment, 'approve')}>
                        {copy.payments.approve}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onReview(payment, 'reject')}>
                        {copy.payments.reject}
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableSurface>
      <PaginationBar meta={data.meta} onPage={onPage} />
    </>
  );
}
