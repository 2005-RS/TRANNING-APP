import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { THROTTLE_LIMIT, THROTTLE_TTL_MS } from './config/app.constants';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { readEnvironment } from './config/read-environment';
import { createTypeOrmNestOptions } from './database/postgres-connection.options';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { TrainerClientAssignmentsModule } from './modules/trainer-client-assignments/trainer-client-assignments.module';
import { TrainersModule } from './modules/trainers/trainers.module';
import { TrainingPlansModule } from './modules/training-plans/training-plans.module';
import { UsersModule } from './modules/users/users.module';
import { BodyMeasurementsModule } from './modules/body-measurements/body-measurements.module';
import { ProgressModule } from './modules/progress/progress.module';
import { NutritionFoodsModule } from './modules/nutrition-foods/nutrition-foods.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { NutritionPlansModule } from './modules/nutrition-plans/nutrition-plans.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProgressPhotosModule } from './modules/progress-photos/progress-photos.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WorkoutSessionsModule } from './modules/workout-sessions/workout-sessions.module';
import { WorkoutTemplatesModule } from './modules/workout-templates/workout-templates.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createTypeOrmNestOptions(readEnvironment(config)),
    }),
    ThrottlerModule.forRoot({
      skipIf: () => process.env.AUTH_E2E_SKIP_THROTTLE === 'true',
      throttlers: [
        {
          name: 'default',
          ttl: THROTTLE_TTL_MS,
          limit: THROTTLE_LIMIT,
        },
      ],
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    TrainersModule,
    ClientsModule,
    TrainerClientAssignmentsModule,
    ExercisesModule,
    WorkoutTemplatesModule,
    TrainingPlansModule,
    WorkoutSessionsModule,
    ProgressModule,
    BodyMeasurementsModule,
    ProgressPhotosModule,
    NutritionFoodsModule,
    NutritionPlansModule,
    CheckInsModule,
    NotificationsModule,
    DashboardModule,
    ChatModule,
  ],
  providers: [
    ThrottlerGuard,
    {
      provide: APP_GUARD,
      useExisting: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
