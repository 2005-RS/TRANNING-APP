import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEventsService } from './activity-events.service';
import { ActivityEvent } from './entities/activity-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEvent])],
  providers: [ActivityEventsService],
  exports: [ActivityEventsService],
})
export class ActivityEventsModule {}
