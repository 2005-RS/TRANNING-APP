import { useState } from 'react';
import { toast } from 'sonner';
import type { BodyMeasurementResponseDto, CreateBodyMeasurementDto, UpdateBodyMeasurementDto } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { MeasurementCard } from '@/features/client-body/components/measurement-card';
import { MeasurementFormSheet } from '@/features/client-body/components/measurement-form-sheet';
import { useBodyMeasurementMutations } from '@/features/client-body/hooks/use-body-measurements';
import { Button } from '@/shared/ui/button';

export function MeasurementsSection({
  measurements,
  page,
  totalPages,
  onPageChange,
}: {
  measurements: BodyMeasurementResponseDto[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { create, update } = useBodyMeasurementMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurementResponseDto | null>(null);
  const latest = measurements[0] ?? null;
  const rest = measurements.slice(1);

  async function onCreate(data: CreateBodyMeasurementDto) {
    await create.mutateAsync({ data });
    toast.success(clientBodyCopy.measurements.saved);
  }

  async function onUpdate(measurementId: string, data: UpdateBodyMeasurementDto) {
    await update.mutateAsync({ measurementId, data });
    toast.success(clientBodyCopy.measurements.updated);
  }

  return (
    <section className="space-y-4" aria-labelledby="body-measurements-heading">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h2 id="body-measurements-heading" className="text-lg font-semibold tracking-tight">
            {clientBodyCopy.measurements.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientBodyCopy.measurements.description}
          </p>
        </div>
        <Button
          className="min-h-12 shrink-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {clientBodyCopy.measurements.add}
        </Button>
      </div>

      {measurements.length === 0 ? (
        <section className="client-surface-card space-y-2">
          <h3 className="text-base font-semibold tracking-tight">
            {clientBodyCopy.measurements.emptyTitle}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {clientBodyCopy.measurements.emptyBody}
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {latest ? (
            <MeasurementCard
              measurement={latest}
              latest
              onEdit={(item) => {
                setEditing(item);
                setFormOpen(true);
              }}
            />
          ) : null}
          {rest.map((item) => (
            <MeasurementCard
              key={item.id}
              measurement={item}
              onEdit={(selected) => {
                setEditing(selected);
                setFormOpen(true);
              }}
            />
          ))}
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
              <p className="text-sm text-muted-foreground">
                {clientBodyCopy.measurements.page} {page}
              </p>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                {clientBodyCopy.measurements.loadMore}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {formOpen ? (
        <MeasurementFormSheet
          key={editing?.id ?? 'create'}
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) {
              setEditing(null);
            }
          }}
          measurement={editing}
          onCreate={onCreate}
          onUpdate={onUpdate}
        />
      ) : null}
    </section>
  );
}
