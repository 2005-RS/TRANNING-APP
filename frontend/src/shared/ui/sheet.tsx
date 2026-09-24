import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { useNavigationCopy } from '@/features/navigation/copy';

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const SheetContext = createContext<SheetContextValue | null>(null);

function useSheetContext(): SheetContextValue {
  const value = useContext(SheetContext);
  if (!value) {
    throw new Error('Sheet components must be used within Sheet');
  }
  return value;
}

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <SheetContext.Provider value={{ open, onOpenChange, titleId, descriptionId }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetContent({
  side = 'left',
  className,
  children,
  showCloseButton = true,
  closeLabel,
}: {
  side?: 'left' | 'right' | 'bottom';
  className?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  closeLabel?: string;
}) {
  const navigationCopy = useNavigationCopy();
  const { open, onOpenChange, titleId, descriptionId } = useSheetContext();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        'fixed z-[var(--z-modal)] m-0 max-h-none max-w-none overflow-hidden border-border bg-background p-0 text-foreground shadow-lg',
        'backdrop:bg-black/50',
        side === 'left' &&
          'inset-y-0 left-0 right-auto h-svh w-[min(var(--sidebar-width),90vw)] border-r',
        side === 'right' &&
          'inset-y-0 left-auto right-0 h-svh w-[min(var(--sidebar-width),90vw)] border-l',
        side === 'bottom' &&
          'inset-x-0 bottom-0 top-auto max-h-[85svh] w-full rounded-t-xl border-t',
        className,
      )}
      onClose={() => onOpenChange(false)}
      onCancel={(event) => {
        // Chromium fires `cancel` when a file picker opens from a modal dialog.
        // Prevent that from closing the sheet; Escape is handled below.
        event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onOpenChange(false);
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.clientX === 0 && event.clientY === 0) {
          return;
        }
        onOpenChange(false);
      }}
    >
      {showCloseButton ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 size-10"
          aria-label={closeLabel ?? navigationCopy.closeNavigation}
          onClick={() => onOpenChange(false)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      ) : null}
      {children}
    </dialog>
  );
}

export function SheetHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-1 px-4 pb-2 pt-4 pr-14', className)} {...props} />
  );
}

export function SheetTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useSheetContext();
  return (
    <h2
      id={titleId}
      className={cn('text-base font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useSheetContext();
  return (
    <p
      id={descriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
