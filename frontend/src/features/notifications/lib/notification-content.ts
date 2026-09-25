import type { LucideIcon } from 'lucide-react';
import { Apple, Bell, ClipboardCheck, ClipboardList, Dumbbell } from 'lucide-react';
import {
  NotificationRelatedEntityDtoType,
  NotificationResponseDtoType,
  type NotificationResponseDto,
} from '@/generated/models';
import { notificationsCopy } from '@/features/notifications/copy';

export type NotificationsRole = 'CLIENT' | 'TRAINER' | 'ADMIN';

/**
 * Deep links built only from contract fields (`relatedEntity`, `clientProfileId`).
 * A target is returned only when the recipient's workspace has a route for it.
 */
export type NotificationTarget =
  | { kind: 'client-check-in'; checkInId: string }
  | { kind: 'client-training' }
  | { kind: 'client-nutrition' }
  | { kind: 'trainer-check-in'; clientId: string; checkInId: string }
  | { kind: 'trainer-training-plan'; clientId: string; planId: string }
  | { kind: 'trainer-nutrition-plan'; clientId: string; planId: string };

const KNOWN_TYPES = new Set<string>(Object.values(NotificationResponseDtoType));

type TypeCopyKey = keyof typeof notificationsCopy.types;

function typeCopyKey(type: string): TypeCopyKey {
  return KNOWN_TYPES.has(type) ? (type as TypeCopyKey) : 'unknown';
}

export function notificationText(
  notification: Pick<NotificationResponseDto, 'type'>,
  role: NotificationsRole,
): { title: string; body: string } {
  const copy = notificationsCopy.types[typeCopyKey(notification.type)];
  return {
    title: copy.title,
    body: role === 'CLIENT' ? copy.body : copy.bodyTrainer,
  };
}

export function notificationIcon(notification: Pick<NotificationResponseDto, 'type'>): LucideIcon {
  switch (notification.type) {
    case NotificationResponseDtoType.CHECK_IN_SUBMITTED:
      return ClipboardList;
    case NotificationResponseDtoType.CHECK_IN_REVIEWED:
      return ClipboardCheck;
    case NotificationResponseDtoType.TRAINING_PLAN_ACTIVATED:
      return Dumbbell;
    case NotificationResponseDtoType.NUTRITION_PLAN_ACTIVATED:
      return Apple;
    default:
      return Bell;
  }
}

function clientTarget(notification: NotificationResponseDto): NotificationTarget | null {
  const { relatedEntity } = notification;
  switch (notification.type) {
    case NotificationResponseDtoType.CHECK_IN_REVIEWED:
      return relatedEntity.type === NotificationRelatedEntityDtoType.CHECK_IN
        ? { kind: 'client-check-in', checkInId: relatedEntity.id }
        : null;
    // Clients read the current plan only; there is no per-plan Client route.
    case NotificationResponseDtoType.TRAINING_PLAN_ACTIVATED:
      return { kind: 'client-training' };
    case NotificationResponseDtoType.NUTRITION_PLAN_ACTIVATED:
      return { kind: 'client-nutrition' };
    default:
      return null;
  }
}

function trainerTarget(notification: NotificationResponseDto): NotificationTarget | null {
  const clientId = notification.clientProfileId;
  if (!clientId) {
    return null;
  }
  const { relatedEntity } = notification;
  switch (relatedEntity.type) {
    case NotificationRelatedEntityDtoType.CHECK_IN:
      return { kind: 'trainer-check-in', clientId, checkInId: relatedEntity.id };
    case NotificationRelatedEntityDtoType.TRAINING_PLAN:
      return { kind: 'trainer-training-plan', clientId, planId: relatedEntity.id };
    case NotificationRelatedEntityDtoType.NUTRITION_PLAN:
      return { kind: 'trainer-nutrition-plan', clientId, planId: relatedEntity.id };
    default:
      return null;
  }
}

/**
 * ADMIN has no route for Client check-ins or plans (F11 does not inspect
 * Client fitness data), so Admin notifications have no deep link.
 */
export function notificationTarget(
  notification: NotificationResponseDto,
  role: NotificationsRole,
): NotificationTarget | null {
  if (role === 'CLIENT') {
    return clientTarget(notification);
  }
  if (role === 'TRAINER') {
    return trainerTarget(notification);
  }
  return null;
}

export function isUnread(notification: Pick<NotificationResponseDto, 'readAt'>): boolean {
  return !notification.readAt;
}
