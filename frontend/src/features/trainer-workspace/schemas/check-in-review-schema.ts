import { z } from 'zod';

export const checkInReviewSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(1, 'Feedback is required.')
    .max(4000, 'Feedback must be 4000 characters or fewer.'),
  actionItems: z.string().max(2000, 'Action items must be 2000 characters or fewer.'),
});

export type CheckInReviewFormValues = z.infer<typeof checkInReviewSchema>;
