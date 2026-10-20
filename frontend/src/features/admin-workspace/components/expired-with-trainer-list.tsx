import { Link } from '@tanstack/react-router';
import type { PaginatedExpiredSubscriptionClientsResponseDto } from '@/generated/models';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { AdminErrorState, AdminListSkeleton } from '@/features/admin-workspace/components/admin-primitives';

export function ExpiredWithTrainerList({
  pending,
  error,
  data,
  retrying,
  onRetry,
}: {
  pending: boolean;
  error: unknown;
  data: PaginatedExpiredSubscriptionClientsResponseDto | undefined;
  retrying: boolean;
  onRetry: () => void;
}) {
  const copy = useAdminWorkspaceCopy();

  return (
    <section className="space-y-3" aria-labelledby="expired-with-trainer-heading">
      <div>
        <h2 id="expired-with-trainer-heading" className="text-lg font-semibold">
          {copy.payments.expired}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.payments.expiredBody}</p>
      </div>
      {pending ? <AdminListSkeleton label={copy.payments.expired} /> : null}
      {!pending && error ? (
        <AdminErrorState inline error={error} retrying={retrying} onRetry={onRetry} />
      ) : null}
      {!pending && !error
        ? data?.data.map((client) => (
            <Link
              key={client.id}
              to="/admin/clients/$clientId"
              params={{ clientId: client.id }}
              className="block rounded-md border border-border p-3 hover:bg-muted/50"
            >
              {client.firstName} {client.lastName}
              <span className="block text-sm text-muted-foreground">{client.email}</span>
            </Link>
          ))
        : null}
    </section>
  );
}
