import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { NutritionFood } from '../nutrition-foods/entities/nutrition-food.entity';
import { NutritionFoodsModule } from '../nutrition-foods/nutrition-foods.module';
import { NutritionPlan } from '../nutrition-plans/entities/nutrition-plan.entity';
import { TrainerClientAssignmentsModule } from '../trainer-client-assignments/trainer-client-assignments.module';
import { ClientNutritionFoodsController } from './client-nutrition-foods.controller';
import { ClientNutritionFoodsService } from './client-nutrition-foods.service';
import { ClientNutritionJournalController } from './client-nutrition-journal.controller';
import { FoodLogEntry } from './entities/food-log-entry.entity';
import { NutritionJournalService } from './nutrition-journal.service';
import { OpenFoodFactsClient } from './open-food-facts/open-food-facts.client';
import { TrainerNutritionJournalController } from './trainer-nutrition-journal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodLogEntry, NutritionPlan, NutritionFood]),
    ClientsModule,
    TrainerClientAssignmentsModule,
    NutritionFoodsModule,
  ],
  // Static /clients/me/... must register before /clients/:clientId/...
  controllers: [
    ClientNutritionJournalController,
    ClientNutritionFoodsController,
    TrainerNutritionJournalController,
  ],
  providers: [
    NutritionJournalService,
    ClientNutritionFoodsService,
    OpenFoodFactsClient,
  ],
  exports: [NutritionJournalService],
})
export class NutritionJournalModule {}
