import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { TrainingPlansModule } from '../training-plans/training-plans.module';
import { ClientWorkoutSessionsController } from './client-workout-sessions.controller';
import { WorkoutSessionExercise } from './entities/workout-session-exercise.entity';
import { WorkoutSession } from './entities/workout-session.entity';
import { WorkoutSet } from './entities/workout-set.entity';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { WorkoutSessionsService } from './workout-sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkoutSession,
      WorkoutSessionExercise,
      WorkoutSet,
    ]),
    ClientsModule,
    TrainerClientAssignmentsModule,
    TrainingPlansModule,
    ExercisesModule,
  ],
  // Static /clients/me/workout-sessions must register before /clients/:clientId/workout-sessions.
  controllers: [ClientWorkoutSessionsController, WorkoutSessionsController],
  providers: [WorkoutSessionsService],
  exports: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
