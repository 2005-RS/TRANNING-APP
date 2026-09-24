import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartWorkoutSessionDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'TrainingPlanWorkout UUID from the Client current ACTIVE Training Plan. Ownership is taken from the authenticated Client.',
  })
  @IsUUID('4')
  trainingPlanWorkoutId!: string;
}
