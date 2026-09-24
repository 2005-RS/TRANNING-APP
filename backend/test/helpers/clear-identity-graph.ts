import { DataSource } from 'typeorm';
import { BodyMeasurement } from '../../src/modules/body-measurements/entities/body-measurement.entity';
import { ProgressPhoto } from '../../src/modules/progress-photos/entities/progress-photo.entity';
import { AuthSession } from '../../src/modules/auth/entities/auth-session.entity';
import { Exercise } from '../../src/modules/exercises/entities/exercise.entity';
import { ExerciseMedia } from '../../src/modules/exercises/media/entities/exercise-media.entity';
import { TrainerClientAssignment } from '../../src/modules/trainer-client-assignments/entities/trainer-client-assignment.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { WorkoutTemplate } from '../../src/modules/workout-templates/entities/workout-template.entity';
import { WorkoutTemplateExercise } from '../../src/modules/workout-templates/entities/workout-template-exercise.entity';
import { TrainingPlan } from '../../src/modules/training-plans/entities/training-plan.entity';
import { TrainingPlanExercise } from '../../src/modules/training-plans/entities/training-plan-exercise.entity';
import { TrainingPlanWorkout } from '../../src/modules/training-plans/entities/training-plan-workout.entity';
import { WorkoutSessionExercise } from '../../src/modules/workout-sessions/entities/workout-session-exercise.entity';
import { WorkoutSession } from '../../src/modules/workout-sessions/entities/workout-session.entity';
import { NutritionFood } from '../../src/modules/nutrition-foods/entities/nutrition-food.entity';
import { NutritionPlanMealItem } from '../../src/modules/nutrition-plans/entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from '../../src/modules/nutrition-plans/entities/nutrition-plan-meal.entity';
import { NutritionPlan } from '../../src/modules/nutrition-plans/entities/nutrition-plan.entity';
import { CheckInReview } from '../../src/modules/check-ins/entities/check-in-review.entity';
import { CheckIn } from '../../src/modules/check-ins/entities/check-in.entity';
import { Notification } from '../../src/modules/notifications/entities/notification.entity';
import { ActivityEvent } from '../../src/modules/activity-events/entities/activity-event.entity';
import { WorkoutSet } from '../../src/modules/workout-sessions/entities/workout-set.entity';

export async function clearIdentityGraph(
  dataSource: DataSource,
): Promise<void> {
  await dataSource
    .getRepository(Notification)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(ActivityEvent)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(CheckInReview)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(CheckIn)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(NutritionPlanMealItem)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(NutritionPlanMeal)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(NutritionPlan)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(NutritionFood)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(ProgressPhoto)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(BodyMeasurement)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(TrainerClientAssignment)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(ExerciseMedia)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(WorkoutSet)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(WorkoutSessionExercise)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(WorkoutSession)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(TrainingPlanExercise)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(TrainingPlanWorkout)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(TrainingPlan)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(WorkoutTemplateExercise)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(WorkoutTemplate)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(Exercise)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource
    .getRepository(AuthSession)
    .createQueryBuilder()
    .delete()
    .execute();
  await dataSource.getRepository(User).createQueryBuilder().delete().execute();
}
