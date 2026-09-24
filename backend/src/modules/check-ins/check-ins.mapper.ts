import { toIsoDateString } from '../clients/iso-date.util';
import {
  CheckInResponseDto,
  CheckInReviewResponseDto,
  CheckInSummaryResponseDto,
} from './dto/check-in-response.dto';
import { CheckInReview } from './entities/check-in-review.entity';
import { CheckIn } from './entities/check-in.entity';
import { CheckInStatus } from './enums/check-in-status.enum';

export function paginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): { page: number; limit: number; totalItems: number; totalPages: number } {
  return {
    page,
    limit,
    totalItems,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
  };
}

export function toCheckInReviewResponse(
  review: CheckInReview,
): CheckInReviewResponseDto {
  return {
    id: review.id,
    feedback: review.feedback,
    actionItems: review.actionItems,
    reviewedByUserId: review.reviewedByUserId,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function toCheckInSummary(checkIn: CheckIn): CheckInSummaryResponseDto {
  return {
    id: checkIn.id,
    periodStart: requireIsoDate(checkIn.periodStart),
    periodEnd: requireIsoDate(checkIn.periodEnd),
    status: checkIn.status,
    submittedAt: checkIn.submittedAt,
    hasReview: checkIn.status === CheckInStatus.REVIEWED,
    createdAt: checkIn.createdAt,
  };
}

export function toCheckInDetail(checkIn: CheckIn): CheckInResponseDto {
  return {
    id: checkIn.id,
    periodStart: requireIsoDate(checkIn.periodStart),
    periodEnd: requireIsoDate(checkIn.periodEnd),
    status: checkIn.status,
    responses: {
      sleepQuality: checkIn.sleepQuality,
      energyLevel: checkIn.energyLevel,
      stressLevel: checkIn.stressLevel,
      hungerLevel: checkIn.hungerLevel,
      recoveryLevel: checkIn.recoveryLevel,
      trainingAdherencePct: checkIn.trainingAdherencePct,
      nutritionAdherencePct: checkIn.nutritionAdherencePct,
      wins: checkIn.wins,
      challenges: checkIn.challenges,
      generalNotes: checkIn.generalNotes,
    },
    submittedAt: checkIn.submittedAt,
    review: checkIn.review ? toCheckInReviewResponse(checkIn.review) : null,
    createdAt: checkIn.createdAt,
    updatedAt: checkIn.updatedAt,
  };
}

function requireIsoDate(value: Date | string): string {
  const iso = toIsoDateString(value);
  if (!iso) {
    throw new Error('Check-in period date is missing');
  }
  return iso;
}
