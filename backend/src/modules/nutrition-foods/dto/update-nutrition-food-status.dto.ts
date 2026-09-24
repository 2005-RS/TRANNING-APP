import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { NutritionFoodStatus } from '../enums/nutrition-food-status.enum';

export class UpdateNutritionFoodStatusDto {
  @ApiProperty({
    enum: NutritionFoodStatus,
    description:
      'ACTIVE foods are shared catalog entries. ARCHIVED foods remain stored. There is no DELETE.',
  })
  @IsEnum(NutritionFoodStatus)
  status!: NutritionFoodStatus;
}
