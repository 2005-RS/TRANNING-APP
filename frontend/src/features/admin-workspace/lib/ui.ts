/** Props that tie a control to its field hint and error text. */
export function fieldA11y(id: string, error?: string, hint?: string) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const;
}

export const adminBackLinkClassName =
  'inline-flex min-h-10 items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function resetFileInput(id: string) {
  const input = document.getElementById(id);
  if (input instanceof HTMLInputElement) {
    input.value = '';
  }
}
