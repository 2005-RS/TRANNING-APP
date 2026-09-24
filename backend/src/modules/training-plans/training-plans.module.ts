import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { WorkoutTemplatesModule } from '../workout-templates/workout-templates.module';
import { ClientTrainingPlansController } from './client-training-plans.controller';
import { TrainingPlanExercise } from './entities/training-plan-exercise.entity';
import { TrainingPlan } from './entities/training-plan.entity';
import { TrainingPlanWorkout } from './entities/training-plan-workout.entity';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingPlan,
      TrainingPlanWorkout,
      TrainingPlanExercise,
    ]),
    ClientsModule,
    TrainerClientAssignmentsModule,
    WorkoutTemplatesModule,
    ExercisesModule,
    NotificationsModule,
  ],
  // Static /clients/me/training-plans must register before /clients/:clientId/training-plans.
  controllers: [ClientTrainingPlansController, TrainingPlansController],
  providers: [TrainingPlansService],
  exports: [TrainingPlansService],
})
export class TrainingPlansModule {}
