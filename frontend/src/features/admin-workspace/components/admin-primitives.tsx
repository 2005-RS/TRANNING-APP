import {
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import type { PaginationMetaDto } from '@/generated/models';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { adminQueryError } from '@/features/admin-workspace/lib/errors';
import { formatNumber, interpolate } from '@/i18n/format';
import { cn } from '@/shared/lib/utils';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@/shared/ui/page';
import { Skeleton } from '@/shared/ui/skeleton';

export function AdminSurface({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5', className)}
      {...props}
    />
  );
}

export function AdminTableSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('overflow-x-auto rounded-lg border border-border bg-card shadow-sm', className)}
      {...props}
    />
  );
}

export function Detail({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AdminStatusBadge({ status }: { status: keyof ReturnType<typeof useAdminWorkspaceCopy>['status'] | string }) {
  const copy = useAdminWorkspaceCopy();
  const label = status in copy.status ? copy.status[status as keyof typeof copy.status] : status;
  const variant = status === 'ACTIVE' || status === 'READY' ? 'secondary' : status === 'DISABLED' || status === 'ARCHIVED' ? 'outline' : 'muted';
  return <Badge variant={variant}>{label}</Badge>;
}

export function NativeSelect({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 min-h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/50',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/50',
        className,
      )}
      {...props}
    />
  );
}

export function AdminField({
  label,
  children,
  className,
  htmlFor,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  /** When set, the label targets this control id and `error` / `hint` are rendered with matching ids. */
  htmlFor?: string;
  error?: string;
  hint?: string;
}) {
  if (!htmlFor) {
    return (
      <Label className={cn('block space-y-1.5', className)}>
        <span className="block">{label}</span>
        {children}
      </Label>
    );
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="block">
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminPageScaffold({
  title,
  description,
  actions,
  backLink,
  meta,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backLink?: ReactNode;
  /** Status badges shown beside the title. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageContainer className="space-y-6">
      {backLink ? <div className="-mb-3">{backLink}</div> : null}
      <PageHeader className="mb-6">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <PageTitle className="break-words">{title}</PageTitle>
            {meta}
          </div>
          {description ? <PageDescription>{description}</PageDescription> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 [&>*]:whitespace-nowrap">{actions}</div>
        ) : null}
      </PageHeader>
      {children}
    </PageContainer>
  );
}

export function AdminPageSkeleton({ label }: { label?: string }) {
  const copy = useAdminWorkspaceCopy();
  return (
    <PageContainer className="space-y-6" aria-label={label ?? copy.loadingLabel} role="status">
      <Skeleton className="h-9 w-60" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-3 md:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </PageContainer>
  );
}

export function AdminListSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4" role="status" aria-label={label}>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-11" />
      ))}
    </div>
  );
}

export function AdminErrorState({
  error,
  onRetry,
  retrying,
  title,
  inline = false,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
  title?: string;
  /** Render inside an existing page instead of as the whole page. */
  inline?: boolean;
}) {
  const copy = useAdminWorkspaceCopy();
  const mapped = adminQueryError(error, copy);
  const titleId = useId();
  const Wrapper = inline ? 'div' : PageContainer;
  return (
    <Wrapper>
      <AdminSurface className="py-10 text-center" aria-labelledby={titleId} role="alert">
        <AlertTriangle className="mx-auto size-7 text-warning" aria-hidden />
        <h2 id={titleId} className="mt-3 text-lg font-semibold tracking-tight">
          {title ?? mapped.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {mapped.description}
        </p>
        <Button className="mt-6 min-h-10 min-w-36" disabled={retrying} onClick={onRetry}>
          {retrying ? copy.retrying : copy.retry}
        </Button>
      </AdminSurface>
    </Wrapper>
  );
}

export function AdminEmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  const titleId = useId();
  return (
    <AdminSurface className="py-8" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
      {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
    </AdminSurface>
  );
}

/**
 * Distinguishes "no records exist" from "no records match the current filters".
 * A filtered empty result offers a single way back to the unfiltered list.
 */
export function AdminListEmptyState({
  filtered,
  emptyTitle,
  emptyBody,
  onClearFilters,
  emptyActions,
}: {
  filtered: boolean;
  emptyTitle: string;
  emptyBody: string;
  onClearFilters: () => void;
  emptyActions?: ReactNode;
}) {
  const copy = useAdminWorkspaceCopy();
  if (filtered) {
    return (
      <AdminEmptyState
        title={copy.common.noMatchesTitle}
        body={copy.common.noMatchesBody}
        actions={
          <Button variant="outline" onClick={onClearFilters}>
            {copy.clearFilters}
          </Button>
        }
      />
    );
  }
  return <AdminEmptyState title={emptyTitle} body={emptyBody} actions={emptyActions} />;
}

export function AdminFormError({ error }: { error: string | null }) {
  return error ? (
    <Alert variant="danger" role="alert">
      {error}
    </Alert>
  ) : null;
}

export function ResultCount({ meta }: { meta: PaginationMetaDto }) {
  const copy = useAdminWorkspaceCopy();
  if (meta.totalItems === 0) {
    return null;
  }
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.totalItems);
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {interpolate(copy.common.showing, {
        from: formatNumber(from),
        to: formatNumber(to),
        total: formatNumber(meta.totalItems),
      })}
    </p>
  );
}

export function PaginationBar({
  meta,
  onPage,
}: {
  meta: PaginationMetaDto;
  onPage: (page: number) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  if (meta.totalItems === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ResultCount meta={meta} />
      {meta.totalPages > 1 ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {copy.page} {meta.page} / {meta.totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          {copy.previous}
        </Button>
        <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          {copy.next}
        </Button>
      </div>
      ) : null}
    </div>
  );
}

export function AdminFilePicker({
  id,
  accept,
  file,
  disabled,
  describedBy,
  invalid,
  onChange,
}: {
  id: string;
  accept: string;
  file: File | null;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
  onChange: (file: File | null) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = `${id}-name`;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        aria-describedby={[nameId, describedBy].filter(Boolean).join(' ')}
        aria-invalid={invalid || undefined}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" aria-hidden />
        {copy.exercises.chooseFile}
      </Button>
      <span id={nameId} className="min-w-0 truncate text-sm text-muted-foreground">
        {file ? file.name : copy.exercises.noFileChosen}
      </span>
    </div>
  );
}

export function SearchInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <AdminField label={label} className="min-w-56 flex-1">
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </AdminField>
  );
}
