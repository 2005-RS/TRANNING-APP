import { useId, useState, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExerciseMediaResponseDtoStatus,
  type ExerciseMediaResponseDto,
  type ExerciseResponseDto,
} from '@/generated/models';
import { ConfirmSheet } from '@/features/trainer-workspace/components/confirm-sheet';
import { StatusBadge } from '@/features/trainer-workspace/components/status-badge';
import { useExerciseMediaMutations } from '@/features/trainer-workspace/hooks/use-exercise-media-mutations';
import { useTrainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import { invalidateTrainerExercises } from '@/features/trainer-workspace/lib/invalidate';
import {
  canManageExerciseMedia,
  canUploadExerciseMedia,
  EXERCISE_MEDIA_ACCEPT,
  maxBytesForMediaType,
  mediaCountLimit,
  mediaTypeForMime,
  occupiedMediaCount,
} from '@/features/trainer-workspace/lib/exercise-media';
import { postSignedUpload } from '@/shared/lib/signed-upload';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';

export function ExerciseMediaManager({
  exercise,
  media,
  mediaPending = false,
  userId,
}: {
  exercise: ExerciseResponseDto;
  media: ExerciseMediaResponseDto[];
  mediaPending?: boolean;
  userId: string | null;
}) {
  const trainerWorkspaceCopy = useTrainerWorkspaceCopy();
  const copy = trainerWorkspaceCopy.exercises;
  const fileId = useId();
  const queryClient = useQueryClient();
  const { createUpload, finalize, remove } = useExerciseMediaMutations();
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ExerciseMediaResponseDto | null>(null);

  const canManage = canManageExerciseMedia(exercise, userId);
  const canUpload = canUploadExerciseMedia(exercise, userId);
  const visibleMedia = canManage
    ? media
    : media.filter((item) => item.status === ExerciseMediaResponseDtoStatus.READY);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!canUpload) {
      return;
    }
    if (!file) {
      setError(copy.missingFile);
      return;
    }
    const mediaType = mediaTypeForMime(file.type);
    if (!mediaType) {
      setError(copy.badType);
      return;
    }
    if (file.size > maxBytesForMediaType(mediaType)) {
      setError(copy.tooLarge);
      return;
    }
    if (occupiedMediaCount(media, mediaType) >= mediaCountLimit(mediaType)) {
      setError(mediaType === 'VIDEO' ? copy.videoLimit : copy.imageLimit);
      return;
    }

    setPending(true);
    try {
      const request = await createUpload.mutateAsync({
        exerciseId: exercise.id,
        data: {
          mediaType,
          fileName: file.name.slice(0, 255),
          mimeType: file.type,
          fileSizeBytes: file.size,
        },
      });
      await postSignedUpload(request.upload, file);
      await finalize.mutateAsync({ exerciseId: exercise.id, mediaId: request.media.id });
      await invalidateTrainerExercises(queryClient);
      toast.success(copy.uploaded);
      setFile(null);
      setFileKey((key) => key + 1);
    } catch (uploadError) {
      await invalidateTrainerExercises(queryClient);
      if (uploadError instanceof Error && uploadError.message === 'UPLOAD_FAILED') {
        setError(copy.uploadFailed);
      } else {
        setError(mapApiError(uploadError).description);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{copy.media}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {canUpload ? copy.mediaHint : canManage ? copy.archivedNoUpload : copy.catalogReadOnly}
          </p>
        </div>
      </div>

      {error ? (
        <Alert className="mt-4" variant="danger">
          {error}
        </Alert>
      ) : null}

      {canUpload ? (
        <form
          className="mt-4 space-y-3"
          aria-busy={pending || undefined}
          onSubmit={(event) => void onSubmit(event)}
        >
          <div className="space-y-1.5">
            <Label htmlFor={fileId}>{copy.file}</Label>
            <Input
              key={fileKey}
              id={fileId}
              type="file"
              accept={EXERCISE_MEDIA_ACCEPT}
              disabled={pending}
              className="py-2"
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">{file ? file.name : copy.mimeHint}</p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Spinner />
                {copy.uploading}
              </>
            ) : (
              <>
                <Upload className="size-4" aria-hidden />
                {copy.upload}
              </>
            )}
          </Button>
        </form>
      ) : null}

      {mediaPending ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.loadingLabel}</p>
      ) : visibleMedia.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.mediaEmpty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visibleMedia.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.originalFileName ?? item.mediaType}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.mediaType === 'VIDEO' ? copy.videoKind : copy.imageKind}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                {canManage ? (
                  <Button variant="outline" size="sm" onClick={() => setPendingDelete(item)}>
                    {copy.delete}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmSheet
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title={copy.deleteTitle}
        description={copy.deleteBody}
        confirmLabel={remove.isPending ? copy.deleting : copy.confirmDelete}
        cancelLabel={copy.cancel}
        pending={remove.isPending}
        danger
        onConfirm={() => {
          if (!pendingDelete) {
            return;
          }
          void remove
            .mutateAsync({ exerciseId: exercise.id, mediaId: pendingDelete.id })
            .then(async () => {
              await invalidateTrainerExercises(queryClient);
              toast.success(copy.deleted);
              setPendingDelete(null);
            })
            .catch((deleteError: unknown) => {
              setError(mapApiError(deleteError).description);
              setPendingDelete(null);
            });
        }}
      />
    </>
  );
}
