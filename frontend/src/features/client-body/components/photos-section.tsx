import { useState } from 'react';
import type { BodyMeasurementResponseDto, ProgressPhotoResponseDto } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { PhotoCompare } from '@/features/client-body/components/photo-compare';
import { PhotoGallery } from '@/features/client-body/components/photo-gallery';
import { PhotoUploadSheet } from '@/features/client-body/components/photo-upload-sheet';
import { Button } from '@/shared/ui/button';

export function PhotosSection({
  ready,
  pending,
  failed,
  measurements,
  page,
  totalPages,
  onPageChange,
}: {
  ready: ProgressPhotoResponseDto[];
  pending: ProgressPhotoResponseDto[];
  failed: ProgressPhotoResponseDto[];
  measurements: BodyMeasurementResponseDto[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const empty = ready.length === 0 && pending.length === 0 && failed.length === 0;

  return (
    <section className="space-y-4" aria-labelledby="body-photos-heading">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h2 id="body-photos-heading" className="text-lg font-semibold tracking-tight">
            {clientBodyCopy.photos.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{clientBodyCopy.photos.description}</p>
        </div>
        <Button className="min-h-12 shrink-0" onClick={() => setUploadOpen(true)}>
          {clientBodyCopy.photos.add}
        </Button>
      </div>

      {empty ? (
        <section className="client-surface-card space-y-2">
          <h3 className="text-base font-semibold tracking-tight">
            {clientBodyCopy.photos.emptyTitle}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {clientBodyCopy.photos.emptyBody}
          </p>
        </section>
      ) : (
        <PhotoGallery ready={ready} pending={pending} failed={failed} />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 px-1">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {clientBodyCopy.photos.loadMore}
          </Button>
        </div>
      ) : null}

      <PhotoCompare photos={ready} />

      <PhotoUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        measurements={measurements}
      />
    </section>
  );
}
