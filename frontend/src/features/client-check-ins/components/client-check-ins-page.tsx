import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CheckInResponseDtoStatus, type CreateCheckInDto } from '@/generated/models';
import { CheckInsError } from '@/features/client-check-ins/components/check-ins-error';
import { CheckInsSkeleton } from '@/features/client-check-ins/components/check-ins-skeleton';
import {
  CheckInHistoryList,
  CurrentCheckInCard,
} from '@/features/client-check-ins/components/check-in-overview-cards';
import { CreateCheckInSheet } from '@/features/client-check-ins/components/create-check-in-sheet';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import {
  useClientCheckInList,
  useClientCheckInMutations,
} from '@/features/client-check-ins/hooks/use-client-check-ins';
import { Button } from '@/shared/ui/button';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

export function ClientCheckInsPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const listQuery = useClientCheckInList(page);
  const { create } = useClientCheckInMutations();

  const items = listQuery.data?.data ?? [];
  const current = page === 1 ? (items[0] ?? null) : null;
  const history = page === 1 ? items.slice(1) : items;
  const totalPages = listQuery.data?.meta.totalPages ?? 1;
  const loading = listQuery.isPending;
  const listError = listQuery.isError;
  const retrying = listQuery.isFetching;

  async function onCreate(data: CreateCheckInDto) {
    const created = await create.mutateAsync({ data });
    await navigate({
      to: '/client/check-ins/$checkInId',
      params: { checkInId: created.id },
    });
  }

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{clientCheckInsCopy.title}</PageTitle>
          <PageDescription>{clientCheckInsCopy.description}</PageDescription>
        </div>
      </PageHeader>

      {loading ? (
        <CheckInsSkeleton />
      ) : listError ? (
        <CheckInsError
          error={listQuery.error as unknown}
          retrying={retrying}
          onRetry={() => {
            void listQuery.refetch();
          }}
        />
      ) : (
        <div className="space-y-6">
          {current ? (
            <CurrentCheckInCard checkIn={current} />
          ) : (
            <section className="client-surface-card space-y-4" aria-labelledby="empty-check-ins-heading">
              <div className="space-y-2">
                <h2 id="empty-check-ins-heading" className="text-lg font-semibold tracking-tight">
                  {clientCheckInsCopy.current.emptyTitle}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {clientCheckInsCopy.current.emptyBody}
                </p>
              </div>
              <Button className="min-h-14 w-full" onClick={() => setCreateOpen(true)}>
                {clientCheckInsCopy.current.start}
              </Button>
            </section>
          )}

          <CheckInHistoryList
            items={history}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />

          {current ? (
            <Button
              variant={current.status === CheckInResponseDtoStatus.DRAFT ? 'ghost' : 'outline'}
              className={
                current.status === CheckInResponseDtoStatus.DRAFT
                  ? 'min-h-11 w-full text-muted-foreground'
                  : 'min-h-12 w-full'
              }
              onClick={() => setCreateOpen(true)}
            >
              {clientCheckInsCopy.current.start}
            </Button>
          ) : null}
        </div>
      )}

      {createOpen ? (
        <CreateCheckInSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={onCreate}
        />
      ) : null}
    </PageContainer>
  );
}
