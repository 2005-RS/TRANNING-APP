import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ActivityEventEntityType } from './enums/activity-event-entity-type.enum';
import { ActivityEventType } from './enums/activity-event-type.enum';
import { ActivityEvent } from './entities/activity-event.entity';

export interface InsertActivityEventInput {
  type: ActivityEventType;
  actorUserId: string;
  clientProfileId: string | null;
  relatedEntityType: ActivityEventEntityType;
  relatedEntityId: string;
}

@Injectable()
export class ActivityEventsService {
  async insert(
    manager: EntityManager,
    input: InsertActivityEventInput,
  ): Promise<ActivityEvent> {
    const events = manager.getRepository(ActivityEvent);
    return events.save(
      events.create({
        type: input.type,
        actorUserId: input.actorUserId,
        clientProfileId: input.clientProfileId,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      }),
    );
  }
}
