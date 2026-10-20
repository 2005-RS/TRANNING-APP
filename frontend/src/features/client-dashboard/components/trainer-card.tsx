import type { TrainerResponseDto } from '@/generated/models';
import { useClientDashboardCopy } from '@/features/client-dashboard/copy';
import { DashboardCard } from '@/features/client-dashboard/components/dashboard-card';

function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits.startsWith('506') ? digits : `506${digits}`}`;
}

export function TrainerCard({ trainer }: { trainer: TrainerResponseDto }) {
  const copy = useClientDashboardCopy();
  const url = trainer.phone ? whatsappUrl(trainer.phone) : null;
  return (
    <DashboardCard>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{copy.trainer.title}</h2>
        <p className="font-medium">
          {trainer.user.firstName} {trainer.user.lastName}
        </p>
        {trainer.professionalTitle ? (
          <p className="text-sm text-muted-foreground">{trainer.professionalTitle}</p>
        ) : null}
        {trainer.bio ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{trainer.bio}</p>
        ) : null}
        {url ? (
          <a
            href={url}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            {copy.trainer.whatsapp}
          </a>
        ) : null}
      </div>
    </DashboardCard>
  );
}
