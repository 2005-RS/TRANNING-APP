import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nutrient } from './entities/nutrient.entity';
import { NutritionNutrientsController } from './nutrition-nutrients.controller';
import { NutritionNutrientsService } from './nutrition-nutrients.service';

@Module({
  imports: [TypeOrmModule.forFeature([Nutrient])],
  controllers: [NutritionNutrientsController],
  providers: [NutritionNutrientsService],
})
export class NutritionNutrientsModule {}
