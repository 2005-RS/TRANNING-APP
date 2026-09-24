import { motion, useReducedMotion } from 'motion/react';
import type { CheckInReviewResponseDto } from '@/generated/models';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';
import { formatIsoDateTime } from '@/features/client-check-ins/lib/formatters';

export function TrainerFeedback({ review }: { review: CheckInReviewResponseDto }) {
  const reduceMotion = useReducedMotion();
  const reviewedAt = formatIsoDateTime(review.createdAt);

  return (
    <motion.section
      aria-labelledby="trainer-feedback-heading"
      className="client-surface-card dashboard-hero-card dashboard-hero-card--calm space-y-3"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <h2 id="trainer-feedback-heading" className="text-base font-semibold tracking-tight">
        {clientCheckInsCopy.review.title}
      </h2>
      {reviewedAt ? (
        <p className="text-sm text-muted-foreground">
          {clientCheckInsCopy.review.reviewedAt}: {reviewedAt}
        </p>
      ) : null}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{review.feedback}</p>
      {review.actionItems ? (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{clientCheckInsCopy.review.actionItems}</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {review.actionItems}
          </p>
        </div>
      ) : null}
    </motion.section>
  );
}

export function WaitingForReview() {
  return (
    <section className="client-surface-card space-y-2" aria-labelledby="waiting-review-heading">
      <h2 id="waiting-review-heading" className="text-base font-semibold tracking-tight">
        {clientCheckInsCopy.review.waiting}
      </h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {clientCheckInsCopy.review.waitingBody}
      </p>
    </section>
  );
}
