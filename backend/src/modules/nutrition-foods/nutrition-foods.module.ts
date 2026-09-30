import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nutrient } from '../nutrition-nutrients/entities/nutrient.entity';
import { FoodNutrient } from './entities/food-nutrient.entity';
import { FoodPortion } from './entities/food-portion.entity';
import { NutritionFood } from './entities/nutrition-food.entity';
import { NutritionFoodsController } from './nutrition-foods.controller';
import { NutritionFoodsService } from './nutrition-foods.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NutritionFood,
      FoodNutrient,
      FoodPortion,
      Nutrient,
    ]),
  ],
  controllers: [NutritionFoodsController],
  providers: [NutritionFoodsService],
  exports: [NutritionFoodsService],
})
export class NutritionFoodsModule {}
