import { Link } from '@tanstack/react-router';
import { Camera, ChevronRight, Database, ScanBarcode } from 'lucide-react';
import type { JournalMealDtoMealType } from '@/generated/models';
import { useClientNutritionCopy } from '@/features/client-nutrition/copy';
import { Badge } from '@/shared/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet';

const optionClass =
  'flex min-h-16 w-full items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function AddFoodSheet({
  open,
  onOpenChange,
  date,
  meal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  meal: JournalMealDtoMealType;
}) {
  const copy = useClientNutritionCopy();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{copy.addSheet.title}</SheetTitle>
          <SheetDescription>{copy.addSheet.description}</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-3 pb-2">
          <li>
            <Link
              to="/client/nutrition/add"
              search={{ date, meal }}
              className={optionClass}
              onClick={() => onOpenChange(false)}
            >
              <Database className="size-6 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{copy.addSheet.database}</span>
                <span className="block text-xs text-muted-foreground">
                  {copy.addSheet.databaseHint}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
          <li>
            <Link
              to="/client/nutrition/barcode"
              search={{ date, meal }}
              className={optionClass}
              onClick={() => onOpenChange(false)}
            >
              <ScanBarcode className="size-6 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{copy.addSheet.barcode}</span>
                <span className="block text-xs text-muted-foreground">
                  {copy.addSheet.barcodeHint}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
          <li>
            {/* U3: photo recognition only suggests catalog foods; the current AI provider has no vision yet. */}
            <div className={`${optionClass} cursor-not-allowed opacity-60 hover:bg-card`} aria-disabled="true">
              <Camera className="size-6 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {copy.addSheet.photo}
                  <Badge variant="secondary">{copy.addSheet.photoBeta}</Badge>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {copy.addSheet.photoHint}
                </span>
              </span>
            </div>
          </li>
        </ul>
      </SheetContent>
    </Sheet>
  );
}
