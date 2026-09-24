import { useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronRight, LayoutList, Plus } from 'lucide-react';
import { WorkoutTemplatesListStatus } from '@/generated/models';
import type { WorkoutTemplateSummaryResponseDto } from '@/generated/models';
import { useWorkoutTemplatesList } from '@/generated/workout-templates/workout-templates';
import { CreateTemplateSheet } from '@/features/trainer-workspace/components/create-template-sheet';
import { NativeSelect, WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { PaginationBar } from '@/features/trainer-workspace/components/pagination-bar';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { TrainerPageError } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { formatIsoDate } from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageActions, PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';
import { cn } from '@/shared/lib/utils';

export function TrainerTemplatesPage() {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.templates;
  const navigate = useNavigate({ from: '/trainer/training' });
  const search = useSearch({ from: '/trainer/training' });
  const [createOpen, setCreateOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search.search ?? '');
  const query = useWorkoutTemplatesList(
    {
      page: search.page ?? 1,
      limit: TRAINER_LIST_PAGE_SIZE,
      search: search.search,
      status: search.status as (typeof WorkoutTemplatesListStatus)[keyof typeof WorkoutTemplatesListStatus] | undefined,
    },
    { query: { staleTime: TRAINER_STALE_TIME_MS, refetchOnWindowFocus: false } },
  );

  const hasFilters = Boolean(search.search || search.status);

  function applySearch(next: Partial<typeof search>) {
    void navigate({
      search: {
        ...search,
        ...next,
        page: next.page ?? 1,
      },
      replace: true,
    });
  }

  function clearFilters() {
    setSearchDraft('');
    void navigate({ search: {}, replace: true });
  }

  if (query.isError || (!query.data && !query.isPending)) {
    return (
      <TrainerPageError
        error={query.error}
        retrying={query.isFetching}
        onRetry={() => {
          if (!query.isFetching) {
            void query.refetch();
          }
        }}
      />
    );
  }

  const rows = query.data?.data ?? [];
  const emptyCatalog = !query.isPending && rows.length === 0 && !hasFilters;
  const emptyFiltered = !query.isPending && rows.length === 0 && hasFilters;
  const showToolbar = !emptyCatalog;

  return (
    <PageContainer className="space-y-5">
      <PageHeader className="mb-0">
        <div className="min-w-0 space-y-1">
          <PageTitle className="text-2xl sm:text-2xl">{copy.title}</PageTitle>
          <PageDescription className="sm:text-sm">{copy.description}</PageDescription>
        </div>
        <PageActions className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {copy.create}
          </Button>
        </PageActions>
      </PageHeader>

      {emptyCatalog ? (
        <WorkspaceSurface className="flex flex-col items-center px-6 py-12 text-center">
          <LayoutList className="size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold tracking-tight">{copy.emptyTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{copy.emptyBody}</p>
          <Button className="mt-6" onClick={() => setCreateOpen(true)}>
            {copy.emptyCreate}
          </Button>
        </WorkspaceSurface>
      ) : (
        <section className="space-y-3" aria-labelledby="template-library-heading">
          <h2 id="template-library-heading" className="text-sm font-medium text-muted-foreground">
            {copy.libraryTitle}
          </h2>
          <WorkspaceSurface className="overflow-hidden p-0">
            {showToolbar ? (
              <form
                className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  applySearch({ search: searchDraft.trim() || undefined });
                }}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="template-search">{copy.searchLabel}</Label>
                  <Input
                    id="template-search"
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder={copy.searchPlaceholder}
                    maxLength={100}
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                </div>
                <div className="space-y-1 sm:w-40">
                  <Label htmlFor="template-status">{copy.statusFilter}</Label>
                  <NativeSelect
                    id="template-status"
                    value={search.status ?? ''}
                    onChange={(event) => {
                      applySearch({
                        status: event.target.value || undefined,
                        search: searchDraft.trim() || undefined,
                      });
                    }}
                  >
                    <option value="">{copy.statusAll}</option>
                    <option value={WorkoutTemplatesListStatus.DRAFT}>
                      {trainerWorkspaceCopy.status.DRAFT}
                    </option>
                    <option value={WorkoutTemplatesListStatus.ACTIVE}>
                      {trainerWorkspaceCopy.status.ACTIVE}
                    </option>
                    <option value={WorkoutTemplatesListStatus.ARCHIVED}>
                      {trainerWorkspaceCopy.status.ARCHIVED}
                    </option>
                  </NativeSelect>
                </div>
              </form>
            ) : null}

            {query.isPending ? (
              <div className="px-4 py-3">
                <TrainerSectionSkeleton label={copy.loadingLabel} />
              </div>
            ) : emptyFiltered ? (
              <div className="px-6 py-10 text-center">
                <h3 className="text-base font-semibold tracking-tight">{copy.noMatches}</h3>
                <Button className="mt-5" variant="outline" onClick={clearFilters}>
                  {trainerWorkspaceCopy.clearFilters}
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
              </ul>
            )}
          </WorkspaceSurface>
          {query.data ? (
            <PaginationBar
              meta={query.data.meta}
              onPage={(page) => {
                applySearch({ page });
              }}
            />
          ) : null}
        </section>
      )}

      <CreateTemplateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}

function TemplateRow({ template }: { template: WorkoutTemplateSummaryResponseDto }) {
  const copy = useTrainerWorkspaceCopy().templates;
  const updated = formatIsoDate(template.updatedAt, 'd MMM');
  return (
    <li>
      <Link
        to="/trainer/training/$templateId"
        params={{ templateId: template.id }}
        aria-label={`${copy.openTemplate} ${template.name}`}
        className={cn(
          'group flex min-h-12 items-center gap-3 px-4 py-3 no-underline outline-none',
          'transition-colors duration-[var(--motion-fast)]',
          'hover:bg-muted/50 focus-visible:bg-muted/50',
        )}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate font-medium text-foreground">{template.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {updated ? `${copy.updated} ${updated}` : null}
            {template.description ? (
              <span className="hidden sm:inline">
                {updated ? ' · ' : null}
                {template.description}
              </span>
            ) : null}
          </p>
        </div>
        <StatusBadge status={template.status} />
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-[var(--motion-instant)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transform-none"
          aria-hidden
        />
      </Link>
    </li>
  );
}
