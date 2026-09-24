import { Button } from '@/shared/ui/button';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import type { PaginationMetaDto } from '@/generated/models';

export function PaginationBar({
  meta,
  onPage,
}: {
  meta: PaginationMetaDto;
  onPage: (page: number) => void;
}) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  if (meta.totalPages <= 1) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {trainerWorkspaceCopy.clients.pageLabel} {meta.page} / {meta.totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          {trainerWorkspaceCopy.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          {trainerWorkspaceCopy.next}
        </Button>
      </div>
    </div>
  );
}
