import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { firstFieldError } from '@/features/auth/lib/field-error';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import {
  AdminField,
  AdminFormError,
  NativeSelect,
  TextArea,
} from '@/features/admin-workspace/components/admin-primitives';
import { fieldA11y } from '@/features/admin-workspace/lib/ui';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

/** Structural subset of a TanStack Form field bound to a string value. */
type StringField = {
  state: { value: string; meta: { errors: unknown[] } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

type TextFieldProps = {
  field: StringField;
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'autoComplete' | 'inputMode' | 'step' | 'min' | 'max' | 'autoFocus'>;

function fieldLabel(label: string, optional: boolean | undefined, optionalLabel: string) {
  return optional ? `${label} (${optionalLabel.toLowerCase()})` : label;
}

export function FormTextField({
  field,
  id,
  label,
  hint,
  optional,
  multiline,
  rows = 4,
  className,
  ...inputProps
}: TextFieldProps) {
  const copy = useAdminWorkspaceCopy();
  const error = firstFieldError(field.state.meta.errors);
  const a11y = fieldA11y(id, error, hint);
  return (
    <AdminField
      htmlFor={id}
      label={fieldLabel(label, optional, copy.optional)}
      error={error}
      hint={hint}
      className={className}
    >
      {multiline ? (
        <TextArea
          {...a11y}
          rows={rows}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      ) : (
        <Input
          {...a11y}
          {...inputProps}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
    </AdminField>
  );
}

export function FormSelectField({
  field,
  id,
  label,
  children,
  className,
}: {
  field: StringField;
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const error = firstFieldError(field.state.meta.errors);
  return (
    <AdminField htmlFor={id} label={label} error={error} className={className}>
      <NativeSelect
        {...fieldA11y(id, error)}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
      >
        {children}
      </NativeSelect>
    </AdminField>
  );
}

/** Create/edit Sheet with a scrolling body and a pinned action footer. */
export function AdminFormSheet({
  open,
  onOpenChange,
  title,
  description,
  error,
  submitting,
  submitLabel,
  submittingLabel,
  onSubmit,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  error: string | null;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
}) {
  const copy = useAdminWorkspaceCopy();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!submitting) {
          onOpenChange(next);
        }
      }}
    >
      <SheetContent
        side="right"
        closeLabel={copy.close}
        className={cn('w-[min(34rem,100vw)] bg-background p-0', className)}
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <form
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              event.stopPropagation();
              if (!submitting) {
                onSubmit();
              }
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              <AdminFormError error={error} />
              {children}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
              <Button type="button" variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? submittingLabel : submitLabel}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
