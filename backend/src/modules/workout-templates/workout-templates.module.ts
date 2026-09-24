import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesModule } from '../exercises/exercises.module';
import { WorkoutTemplateExercise } from './entities/workout-template-exercise.entity';
import { WorkoutTemplate } from './entities/workout-template.entity';
import { WorkoutTemplatesController } from './workout-templates.controller';
import { WorkoutTemplatesService } from './workout-templates.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutTemplate, WorkoutTemplateExercise]),
    ExercisesModule,
  ],
  controllers: [WorkoutTemplatesController],
  providers: [WorkoutTemplatesService],
  exports: [WorkoutTemplatesService],
})
export class WorkoutTemplatesModule {}
