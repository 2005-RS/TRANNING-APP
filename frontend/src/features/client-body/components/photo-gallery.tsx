import { useState } from 'react';
import { toast } from 'sonner';
import type { ProgressPhotoResponseDto } from '@/generated/models';
import { ProgressPhotoResponseDtoStatus } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { ConfirmSheet } from '@/features/client-body/components/confirm-sheet';
import { PrivateProgressPhoto } from '@/features/client-body/components/private-progress-photo';
import { useProgressPhotoMutations } from '@/features/client-body/hooks/use-progress-photos';
import { formatMeasuredAt } from '@/features/client-body/lib/formatters';
import { Button } from '@/shared/ui/button';

function poseLabel(pose: ProgressPhotoResponseDto['pose']): string {
  return clientBodyCopy.pose[pose];
}

function PhotoMeta({ photo }: { photo: ProgressPhotoResponseDto }) {
  const when = formatMeasuredAt(photo.capturedAt);
  const status =
    photo.status === ProgressPhotoResponseDtoStatus.READY
      ? clientBodyCopy.photos.ready
      : photo.status === ProgressPhotoResponseDtoStatus.FAILED
        ? clientBodyCopy.photos.failed
        : clientBodyCopy.photos.pending;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{poseLabel(photo.pose)}</p>
      <p className="text-xs text-muted-foreground">
        {status}
        {when ? ` · ${when}` : ''}
      </p>
    </div>
  );
}

export function PhotoGallery({
  ready,
  pending,
  failed,
}: {
  ready: ProgressPhotoResponseDto[];
  pending: ProgressPhotoResponseDto[];
  failed: ProgressPhotoResponseDto[];
}) {
  const { remove } = useProgressPhotoMutations();
  const [pendingDelete, setPendingDelete] = useState<ProgressPhotoResponseDto | null>(null);

  return (
    <>
      {pending.length > 0 || failed.length > 0 ? (
        <ul className="space-y-3">
          {[...pending, ...failed].map((photo) => (
            <li key={photo.id} className="client-surface-card flex items-start justify-between gap-3">
              <PhotoMeta photo={photo} />
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => setPendingDelete(photo)}
              >
                {clientBodyCopy.photos.delete}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {ready.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {ready.map((photo) => (
            <li key={photo.id} className="space-y-2">
              <PrivateProgressPhoto
                photoId={photo.id}
                label={`${poseLabel(photo.pose)} ${formatMeasuredAt(photo.capturedAt) ?? ''}`.trim()}
              />
              <div className="flex items-start justify-between gap-2">
                <PhotoMeta photo={photo} />
                <Button
                  variant="ghost"
                  className="min-h-11 shrink-0 px-3"
                  onClick={() => setPendingDelete(photo)}
                >
                  {clientBodyCopy.photos.delete}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <ConfirmSheet
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title={clientBodyCopy.photos.deleteTitle}
        description={clientBodyCopy.photos.deleteBody}
        confirmLabel={
          remove.isPending
            ? clientBodyCopy.photos.deleting
            : clientBodyCopy.photos.confirmDelete
        }
        cancelLabel={clientBodyCopy.photos.cancel}
        pending={remove.isPending}
        danger
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          void remove.mutateAsync({ photoId: pendingDelete.id }).then(() => {
            toast.success(clientBodyCopy.photos.deleted);
            setPendingDelete(null);
          });
        }}
      />
    </>
  );
}
