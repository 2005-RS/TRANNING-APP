import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { NutritionFoodsModule } from '../nutrition-foods/nutrition-foods.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { ClientNutritionPlansController } from './client-nutrition-plans.controller';
import { NutritionPlanMealItem } from './entities/nutrition-plan-meal-item.entity';
import { NutritionPlanMeal } from './entities/nutrition-plan-meal.entity';
import { NutritionPlan } from './entities/nutrition-plan.entity';
import { NutritionPlansController } from './nutrition-plans.controller';
import { NutritionPlansService } from './nutrition-plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NutritionPlan,
      NutritionPlanMeal,
      NutritionPlanMealItem,
    ]),
    ClientsModule,
    TrainerClientAssignmentsModule,
    NutritionFoodsModule,
    NotificationsModule,
  ],
  // Static /clients/me/nutrition-plans must register before /clients/:clientId/nutrition-plans.
  controllers: [ClientNutritionPlansController, NutritionPlansController],
  providers: [NutritionPlansService],
  exports: [NutritionPlansService],
})
export class NutritionPlansModule {}
