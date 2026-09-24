import { useId, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { BodyMeasurementResponseDto, CreateProgressPhotoUploadRequestDto } from '@/generated/models';
import { CreateProgressPhotoUploadRequestDtoPose } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { useProgressPhotoMutations } from '@/features/client-body/hooks/use-progress-photos';
import { datetimeLocalToIso, formatMeasuredAt } from '@/features/client-body/lib/formatters';
import { invalidateProgressPhotoQueries } from '@/features/client-body/lib/invalidate';
import {
  isAllowedProgressPhotoMime,
  PROGRESS_PHOTO_MAX_BYTES,
} from '@/features/client-body/lib/photo-mime';
import { isAbortError, postSignedUpload } from '@/shared/lib/signed-upload';
import { mapApiError } from '@/shared/errors/api-error';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Spinner } from '@/shared/ui/spinner';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

const poses = [
  CreateProgressPhotoUploadRequestDtoPose.FRONT,
  CreateProgressPhotoUploadRequestDtoPose.SIDE,
  CreateProgressPhotoUploadRequestDtoPose.BACK,
  CreateProgressPhotoUploadRequestDtoPose.OTHER,
] as const;

export function PhotoUploadSheet({
  open,
  onOpenChange,
  measurements,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  measurements: BodyMeasurementResponseDto[];
}) {
  const fileId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { createUpload, finalize } = useProgressPhotoMutations();
  const [pose, setPose] = useState<CreateProgressPhotoUploadRequestDtoPose>(
    CreateProgressPhotoUploadRequestDtoPose.FRONT,
  );
  const [file, setFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState('');
  const [measurementId, setMeasurementId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setFile(null);
    setCapturedAt('');
    setMeasurementId('');
    setPose(CreateProgressPhotoUploadRequestDtoPose.FRONT);
    setError(null);
  }

  function closeSheet() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    reset();
    onOpenChange(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError(clientBodyCopy.photos.missingFile);
      return;
    }
    if (!isAllowedProgressPhotoMime(file.type)) {
      setError(clientBodyCopy.photos.badType);
      return;
    }
    if (file.size > PROGRESS_PHOTO_MAX_BYTES) {
      setError(clientBodyCopy.photos.tooLarge);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    try {
      const payload: CreateProgressPhotoUploadRequestDto = {
        originalFileName: file.name.slice(0, 255),
        mimeType: file.type,
        fileSizeBytes: file.size,
        pose,
      };
      const captured = datetimeLocalToIso(capturedAt);
      if (captured) {
        payload.capturedAt = captured;
      }
      if (measurementId) {
        payload.bodyMeasurementId = measurementId;
      }

      const request = await createUpload.mutateAsync({ data: payload });
      await postSignedUpload(request.upload, file, { signal: controller.signal });
      await finalize.mutateAsync({ photoId: request.photo.id });
      await invalidateProgressPhotoQueries(queryClient);
      toast.success(clientBodyCopy.photos.uploaded);
      abortRef.current = null;
      reset();
      onOpenChange(false);
    } catch (uploadError) {
      if (isAbortError(uploadError) || controller.signal.aborted) {
        return;
      }
      await invalidateProgressPhotoQueries(queryClient);
      if (uploadError instanceof Error && uploadError.message === 'UPLOAD_FAILED') {
        setError(clientBodyCopy.photos.failed);
      } else {
        setError(mapApiError(uploadError).description);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!controller.signal.aborted) {
        setPending(false);
      }
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeSheet();
          return;
        }
        onOpenChange(next);
      }}
    >
      <SheetContent side="bottom" className="flex max-h-[90svh] flex-col overflow-hidden px-0">
        <SheetHeader>
          <SheetTitle>{clientBodyCopy.photos.upload}</SheetTitle>
          <SheetDescription>{clientBodyCopy.photos.mimeHint}</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void onSubmit(event)}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <div className="space-y-1.5">
              <Label htmlFor="photo-pose">{clientBodyCopy.photos.pose}</Label>
              <select
                id="photo-pose"
                className="h-12 min-h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={pose}
                onChange={(event) =>
                  setPose(event.target.value as CreateProgressPhotoUploadRequestDtoPose)
                }
              >
                {poses.map((value) => (
                  <option key={value} value={value}>
                    {clientBodyCopy.pose[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={fileId}>{clientBodyCopy.photos.file}</Label>
              <div className="relative">
                <input
                  id={fileId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  disabled={pending}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="pointer-events-none min-h-12 w-full"
                  tabIndex={-1}
                  aria-hidden
                >
                  {clientBodyCopy.photos.chooseFile}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {file ? file.name : clientBodyCopy.photos.noFile}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="captured-at">{clientBodyCopy.photos.captureAt}</Label>
              <Input
                id="captured-at"
                type="datetime-local"
                className="h-12 min-h-12"
                value={capturedAt}
                onChange={(event) => setCapturedAt(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="photo-measurement">{clientBodyCopy.photos.linkMeasurement}</Label>
              <select
                id="photo-measurement"
                className="h-12 min-h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={measurementId}
                onChange={(event) => setMeasurementId(event.target.value)}
              >
                <option value="">{clientBodyCopy.photos.linkNone}</option>
                {measurements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatMeasuredAt(item.measuredAt) ?? item.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Button type="submit" className="min-h-12 w-full" disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  {clientBodyCopy.photos.uploading}
                </>
              ) : (
                clientBodyCopy.photos.upload
              )}
            </Button>
            <Button type="button" variant="outline" className="min-h-12 w-full" onClick={closeSheet}>
              {clientBodyCopy.photos.close}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
