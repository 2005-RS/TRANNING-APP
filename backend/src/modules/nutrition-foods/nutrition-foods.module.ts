import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionFood } from './entities/nutrition-food.entity';
import { NutritionFoodsController } from './nutrition-foods.controller';
import { NutritionFoodsService } from './nutrition-foods.service';

@Module({
  imports: [TypeOrmModule.forFeature([NutritionFood])],
  controllers: [NutritionFoodsController],
  providers: [NutritionFoodsService],
  exports: [NutritionFoodsService],
})
export class NutritionFoodsModule {}
