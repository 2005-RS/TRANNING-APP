import { useState } from 'react';
import type { AdminSubscriptionPaymentResponseDto } from '@/generated/models';
import { useAdminWorkspaceCopy } from '@/features/admin-workspace/copy';
import { ConfirmSheet } from '@/features/admin-workspace/components/confirm-sheet';
import { TextArea } from '@/features/admin-workspace/components/admin-primitives';
import { formatNumber } from '@/i18n/format';
import { Label } from '@/shared/ui/label';

export type PaymentReviewMode = 'approve' | 'reject' | null;

function paymentAmount(value: number): string {
  return formatNumber(value, { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

export function PaymentReviewSheets({
  target,
  mode,
  pending,
  error,
  onClose,
  onApprove,
  onReject,
}: {
  target: AdminSubscriptionPaymentResponseDto | null;
  mode: PaymentReviewMode;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const copy = useAdminWorkspaceCopy();
  const [reason, setReason] = useState('');

  if (!target || !mode) {
    return null;
  }

  const close = (open: boolean) => {
    if (!open) {
      setReason('');
      onClose();
    }
  };

  if (mode === 'approve') {
    return (
      <ConfirmSheet
        open
        onOpenChange={close}
        title={copy.payments.approveTitle}
        description={`${copy.payments.approveBody} ${paymentAmount(target.amountCrc)} · ${target.reference}`}
        confirmLabel={copy.payments.approve}
        cancelLabel={copy.cancel}
        pending={pending}
        error={error}
        onConfirm={onApprove}
      />
    );
  }

  return (
    <ConfirmSheet
      open
      onOpenChange={close}
      title={copy.payments.rejectTitle}
      description={
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">{copy.payments.rejectReason}</Label>
          <TextArea
            id="rejection-reason"
            value={reason}
            aria-invalid={Boolean(error)}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      }
      confirmLabel={copy.payments.reject}
      cancelLabel={copy.cancel}
      pending={pending}
      danger
      error={error}
      onConfirm={() => onReject(reason)}
    />
  );
}
