import { Badge } from '@/shared/ui/badge';
import { checkInStatusLabel } from '@/features/client-check-ins/lib/status';

export function CheckInStatusBadge({
  status,
  hasReview = false,
}: {
  status: string;
  hasReview?: boolean;
}) {
  return (
    <Badge variant="muted">
      <span className="sr-only">Status: </span>
      {checkInStatusLabel(status, hasReview)}
    </Badge>
  );
}
