import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetClientTrainerDto {
  @ApiProperty({ format: 'uuid', description: 'TrainerProfile UUID' })
  @IsUUID('4')
  trainerId!: string;
}
