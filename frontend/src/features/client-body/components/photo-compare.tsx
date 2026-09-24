import { useMemo, useState } from 'react';
import type { ProgressPhotoResponseDto } from '@/generated/models';
import { clientBodyCopy } from '@/features/client-body/copy';
import { PrivateProgressPhoto } from '@/features/client-body/components/private-progress-photo';
import { formatMeasuredAt } from '@/features/client-body/lib/formatters';
import { Label } from '@/shared/ui/label';

function optionLabel(photo: ProgressPhotoResponseDto): string {
  const when = formatMeasuredAt(photo.capturedAt);
  const pose = clientBodyCopy.pose[photo.pose];
  return when ? `${pose} · ${when}` : pose;
}

export function PhotoCompare({ photos }: { photos: ProgressPhotoResponseDto[] }) {
  const sorted = useMemo(
    () => [...photos].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)),
    [photos],
  );
  const [firstId, setFirstId] = useState('');
  const [secondId, setSecondId] = useState('');
  const resolvedFirst = firstId || sorted[0]?.id || '';
  const resolvedSecond =
    secondId || (sorted.length > 1 ? sorted[sorted.length - 1]?.id ?? '' : '');

  if (photos.length < 2) {
    return (
      <section className="client-surface-card space-y-2" aria-labelledby="body-compare-heading">
        <h2 id="body-compare-heading" className="text-lg font-semibold tracking-tight">
          {clientBodyCopy.compare.title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clientBodyCopy.compare.needTwo}
        </p>
      </section>
    );
  }

  const same = resolvedFirst.length > 0 && resolvedFirst === resolvedSecond;

  return (
    <section className="space-y-4" aria-labelledby="body-compare-heading">
      <div className="px-1">
        <h2 id="body-compare-heading" className="text-lg font-semibold tracking-tight">
          {clientBodyCopy.compare.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{clientBodyCopy.compare.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="compare-first">{clientBodyCopy.compare.first}</Label>
          <select
            id="compare-first"
            className="h-12 min-h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={resolvedFirst}
            onChange={(event) => setFirstId(event.target.value)}
          >
            <option value="">{clientBodyCopy.compare.choose}</option>
            {sorted.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {optionLabel(photo)}
              </option>
            ))}
          </select>
          {resolvedFirst ? (
            <PrivateProgressPhoto photoId={resolvedFirst} label={clientBodyCopy.compare.first} />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="compare-second">{clientBodyCopy.compare.second}</Label>
          <select
            id="compare-second"
            className="h-12 min-h-12 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={resolvedSecond}
            onChange={(event) => setSecondId(event.target.value)}
          >
            <option value="">{clientBodyCopy.compare.choose}</option>
            {sorted.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {optionLabel(photo)}
              </option>
            ))}
          </select>
          {resolvedSecond ? (
            <PrivateProgressPhoto photoId={resolvedSecond} label={clientBodyCopy.compare.second} />
          ) : null}
        </div>
      </div>
      {same ? (
        <p className="text-sm text-muted-foreground">{clientBodyCopy.compare.same}</p>
      ) : null}
    </section>
  );
}
