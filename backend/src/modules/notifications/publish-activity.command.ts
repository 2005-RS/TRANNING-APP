import { ActivityEventType } from '../activity-events/enums/activity-event-type.enum';

export type PublishActivityCommand =
  | {
      type: ActivityEventType.CHECK_IN_SUBMITTED;
      actorUserId: string;
      clientProfileId: string;
      relatedEntityId: string;
      recipientUserId: string | null;
    }
  | {
      type: ActivityEventType.CHECK_IN_REVIEWED;
      actorUserId: string;
      clientProfileId: string;
      relatedEntityId: string;
      recipientUserId: string;
    }
  | {
      type: ActivityEventType.TRAINING_PLAN_ACTIVATED;
      actorUserId: string;
      clientProfileId: string;
      relatedEntityId: string;
      recipientUserId: string;
    }
  | {
      type: ActivityEventType.NUTRITION_PLAN_ACTIVATED;
      actorUserId: string;
      clientProfileId: string;
      relatedEntityId: string;
      recipientUserId: string;
    };
