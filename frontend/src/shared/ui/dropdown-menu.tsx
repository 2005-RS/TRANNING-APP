import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/utils';

type MenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerId: string;
  menuId: string;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(): MenuContextValue {
  const value = useContext(MenuContext);
  if (!value) {
    throw new Error('DropdownMenu components must be used within DropdownMenu');
  }
  return value;
}

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerId = useId();
  const menuId = useId();
  return (
    <MenuContext.Provider value={{ open, setOpen, triggerId, menuId }}>
      <div className="relative">{children}</div>
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, triggerId, menuId } = useMenu();
  return (
    <button
      type="button"
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      className={className}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  className,
  align = 'end',
  children,
}: {
  className?: string;
  align?: 'start' | 'end';
  children: ReactNode;
}) {
  const { open, setOpen, triggerId, menuId } = useMenu();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      const trigger = document.getElementById(triggerId);
      if (ref.current?.contains(target) || trigger?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        document.getElementById(triggerId)?.focus();
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen, triggerId]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={ref}
      id={menuId}
      role="menu"
      aria-labelledby={triggerId}
      className={cn(
        'absolute z-[var(--z-dropdown)] mt-2 min-w-56 rounded-lg border border-border bg-card p-1 shadow-md',
        align === 'end' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className,
  onSelect,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { onSelect?: () => void }) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground',
        'hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
      {...props}
    />
  );
}

export function DropdownMenuRadioGroup({
  children,
}: {
  children: ReactNode;
}) {
  return <div role="group">{children}</div>;
}

export function DropdownMenuRadioItem({
  checked,
  onSelect,
  children,
  className,
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { setOpen } = useMenu();
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
        checked ? 'bg-muted font-medium text-foreground' : 'text-foreground hover:bg-muted',
        className,
      )}
      onClick={() => {
        onSelect();
        setOpen(false);
      }}
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          checked ? 'bg-foreground' : 'bg-transparent',
        )}
      />
      {children}
    </button>
  );
}
