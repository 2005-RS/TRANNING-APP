import {
  CheckInResponseDtoStatus,
  CheckInSummaryResponseDtoStatus,
} from '@/generated/models';
import { clientCheckInsCopy } from '@/features/client-check-ins/copy';

export type CheckInStatus =
  | typeof CheckInResponseDtoStatus.DRAFT
  | typeof CheckInResponseDtoStatus.SUBMITTED
  | typeof CheckInResponseDtoStatus.REVIEWED;

export function isDraftStatus(status: string): boolean {
  return status === CheckInResponseDtoStatus.DRAFT;
}

export function isReviewedStatus(status: string, hasReview = false): boolean {
  return status === CheckInResponseDtoStatus.REVIEWED || hasReview;
}

export function checkInStatusLabel(status: string, hasReview = false): string {
  if (status === CheckInResponseDtoStatus.DRAFT) {
    return clientCheckInsCopy.status.draft;
  }
  if (isReviewedStatus(status, hasReview)) {
    return clientCheckInsCopy.status.reviewed;
  }
  if (status === CheckInResponseDtoStatus.SUBMITTED) {
    return clientCheckInsCopy.status.waitingReview;
  }
  return clientCheckInsCopy.status.submitted;
}

export function isWritableCheckInStatus(status: CheckInStatus): boolean {
  return status === CheckInResponseDtoStatus.DRAFT;
}

export { CheckInResponseDtoStatus, CheckInSummaryResponseDtoStatus };
