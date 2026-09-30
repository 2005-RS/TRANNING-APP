import { Badge } from '@/shared/ui/badge';
import { statusLabel } from '@/features/trainer-workspace/lib/formatters';
import { useLanguage } from '@/i18n/use-language';

export function StatusBadge({ status }: { status: string }) {
  useLanguage();
  const variant =
    status === 'ACTIVE' || status === 'REVIEWED' || status === 'READY'
      ? 'default'
      : status === 'SUBMITTED' ||
          status === 'DRAFT' ||
          status === 'IN_PROGRESS' ||
          status === 'PENDING_UPLOAD'
        ? 'secondary'
        : status === 'ARCHIVED' || status === 'DISABLED' || status === 'CANCELLED'
          ? 'outline'
          : 'muted';
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}
