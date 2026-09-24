import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProfile } from '../clients/entities/client-profile.entity';
import { StorageModule } from '../../storage/storage.module';
import { TrainingPlanExercise } from '../training-plans/entities/training-plan-exercise.entity';
import { WorkoutSessionExercise } from '../workout-sessions/entities/workout-session-exercise.entity';
import { Exercise } from './entities/exercise.entity';
import { ExerciseMediaController } from './media/exercise-media.controller';
import { ExerciseMediaService } from './media/exercise-media.service';
import { ExerciseMedia } from './media/entities/exercise-media.entity';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercise,
      ExerciseMedia,
      WorkoutSessionExercise,
      TrainingPlanExercise,
      ClientProfile,
    ]),
    StorageModule,
  ],
  controllers: [ExercisesController, ExerciseMediaController],
  providers: [ExercisesService, ExerciseMediaService],
  exports: [ExercisesService, ExerciseMediaService],
})
export class ExercisesModule {}
