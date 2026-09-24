import { ApiError } from '@/shared/errors/api-error';
import { ProgressPhotoResponseDtoStatus } from '@/generated/models';
import { useBodyMeasurementsList } from '@/generated/body-measurements/body-measurements';
import { useProgressPhotosList } from '@/generated/progress-photos/progress-photos';
import { TrainerPrivatePhoto } from '@/features/trainer-workspace/components/trainer-private-photo';
import { TrainerErrorState } from '@/features/trainer-workspace/components/trainer-states';
import { TrainerSectionSkeleton } from '@/features/trainer-workspace/components/trainer-skeleton';
import { WorkspaceSurface } from '@/features/trainer-workspace/components/workspace-surface';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';
import {
  formatCm,
  formatIsoDateTime,
  formatKg,
  formatPercentValue,
} from '@/features/trainer-workspace/lib/formatters';
import { TRAINER_LIST_PAGE_SIZE, TRAINER_STALE_TIME_MS } from '@/features/trainer-workspace/lib/query-policy';
import { useTrainerClientId } from '@/features/trainer-workspace/lib/use-client-id';

const copy = trainerWorkspaceCopy.body;

function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 403;
}

export function TrainerClientBodyPage() {
  const clientId = useTrainerClientId();
  const queryOptions = {
    query: {
      enabled: Boolean(clientId),
      staleTime: TRAINER_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  };
  const measurementsQuery = useBodyMeasurementsList(
    clientId,
    { limit: TRAINER_LIST_PAGE_SIZE },
    queryOptions,
  );
  const photosQuery = useProgressPhotosList(
    clientId,
    { limit: TRAINER_LIST_PAGE_SIZE, status: ProgressPhotoResponseDtoStatus.READY },
    { ...queryOptions, query: { ...queryOptions.query, retry: false } },
  );
  const photosForbidden = isForbidden(photosQuery.error);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <WorkspaceSurface className="lg:col-span-7" aria-labelledby="body-measurements-heading">
        <h2 id="body-measurements-heading" className="text-lg font-semibold tracking-tight">
          {copy.measurements}
        </h2>
        {measurementsQuery.isPending ? (
          <TrainerSectionSkeleton label={copy.loadingLabel} />
        ) : measurementsQuery.isError ? (
          <TrainerErrorState
            error={measurementsQuery.error}
            retrying={measurementsQuery.isFetching}
            onRetry={() => {
              if (!measurementsQuery.isFetching) {
                void measurementsQuery.refetch();
              }
            }}
          />
        ) : measurementsQuery.data?.data.length ? (
          <ul className="mt-4 space-y-3">
            {measurementsQuery.data.data.map((row) => (
              <li key={row.id} className="rounded-md border border-border p-3">
                <p className="font-mono text-sm tabular-nums text-muted-foreground">
                  {formatIsoDateTime(row.measuredAt)}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <Item label={copy.weight} value={formatKg(row.bodyWeightKg)} />
                  <Item label={copy.bodyFat} value={formatPercentValue(row.bodyFatPercentage)} />
                  <Item label="Waist" value={formatCm(row.waistCm)} />
                  <Item label="Chest" value={formatCm(row.chestCm)} />
                </dl>
                {row.notes ? (
                  <p className="mt-2 text-sm text-muted-foreground">{row.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.measurementsEmpty}</p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface className="lg:col-span-5" aria-labelledby="body-photos-heading">
        <h2 id="body-photos-heading" className="text-lg font-semibold tracking-tight">
          {copy.photos}
        </h2>
        {photosForbidden ? (
          <p className="mt-3 text-sm text-muted-foreground">{copy.photosForbidden}</p>
        ) : photosQuery.isPending ? (
          <TrainerSectionSkeleton label={copy.loadingLabel} rows={2} />
        ) : photosQuery.isError ? (
          <TrainerErrorState
            error={photosQuery.error}
            retrying={photosQuery.isFetching}
            onRetry={() => {
              if (!photosQuery.isFetching) {
                void photosQuery.refetch();
              }
            }}
          />
        ) : photosQuery.data?.data.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {photosQuery.data.data.map((photo) => (
              <li key={photo.id} className="space-y-2">
                <TrainerPrivatePhoto
                  clientId={clientId}
                  photoId={photo.id}
                  label={`${trainerWorkspaceCopy.poses[photo.pose]} ${formatIsoDateTime(photo.capturedAt) ?? ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  {trainerWorkspaceCopy.poses[photo.pose]} · {formatIsoDateTime(photo.capturedAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{copy.photosEmpty}</p>
        )}
      </WorkspaceSurface>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
