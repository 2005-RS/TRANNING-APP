import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';

/** Back to the journal day the flow started from. */
export function JournalFlowHeader({
  date,
  title,
  children,
}: {
  date?: string;
  title: string;
  children?: ReactNode;
}) {
  const copy = useClientNutritionCopy();
  return (
    <header className="mb-4 flex items-center gap-2">
      <Link
        to="/client/nutrition"
        search={{ date }}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
        aria-label={copy.journal.back}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight">{title}</h1>
      {children}
    </header>
  );
}
