import { useState } from 'react';
import { BodyProgressError } from '@/features/client-body/components/body-progress-error';
import { BodyProgressSkeleton } from '@/features/client-body/components/body-progress-skeleton';
import { MeasurementsSection } from '@/features/client-body/components/measurements-section';
import { PhotosSection } from '@/features/client-body/components/photos-section';
import { clientBodyCopy } from '@/features/client-body/copy';
import { useBodyMeasurementList } from '@/features/client-body/hooks/use-body-measurements';
import {
  useFailedProgressPhotos,
  usePendingProgressPhotos,
  useReadyProgressPhotos,
} from '@/features/client-body/hooks/use-progress-photos';
import { PageContainer, PageDescription, PageHeader, PageTitle } from '@/shared/ui/page';

export function ClientBodyPage() {
  const [measurementPage, setMeasurementPage] = useState(1);
  const [photoPage, setPhotoPage] = useState(1);
  const measurementsQuery = useBodyMeasurementList(measurementPage);
  const readyQuery = useReadyProgressPhotos(photoPage);
  const pendingQuery = usePendingProgressPhotos();
  const failedQuery = useFailedProgressPhotos();

  const loading =
    measurementsQuery.isPending ||
    readyQuery.isPending ||
    pendingQuery.isPending ||
    failedQuery.isPending;
  const error =
    measurementsQuery.error ?? readyQuery.error ?? pendingQuery.error ?? failedQuery.error;
  const retrying =
    measurementsQuery.isFetching ||
    readyQuery.isFetching ||
    pendingQuery.isFetching ||
    failedQuery.isFetching;

  return (
    <PageContainer density="client" className="mx-auto max-w-lg min-w-0">
      <PageHeader className="mb-6">
        <div className="space-y-2">
          <PageTitle>{clientBodyCopy.title}</PageTitle>
          <PageDescription>{clientBodyCopy.description}</PageDescription>
        </div>
      </PageHeader>

      {loading ? (
        <BodyProgressSkeleton />
      ) : error ? (
        <BodyProgressError
          error={error}
          retrying={retrying}
          onRetry={() => {
            void measurementsQuery.refetch();
            void readyQuery.refetch();
            void pendingQuery.refetch();
            void failedQuery.refetch();
          }}
        />
      ) : (
        <div className="space-y-8">
          <MeasurementsSection
            measurements={measurementsQuery.data?.data ?? []}
            page={measurementPage}
            totalPages={measurementsQuery.data?.meta.totalPages ?? 1}
            onPageChange={setMeasurementPage}
          />
          <PhotosSection
            ready={readyQuery.data?.data ?? []}
            pending={pendingQuery.data?.data ?? []}
            failed={failedQuery.data?.data ?? []}
            measurements={measurementsQuery.data?.data ?? []}
            page={photoPage}
            totalPages={readyQuery.data?.meta.totalPages ?? 1}
            onPageChange={setPhotoPage}
          />
        </div>
      )}
    </PageContainer>
  );
}
