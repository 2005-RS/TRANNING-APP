import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { NutritionPlanLifecycleStatus } from '../enums/nutrition-plan-lifecycle-status.enum';

export class UpdateNutritionPlanStatusDto {
  @ApiProperty({
    enum: NutritionPlanLifecycleStatus,
    description:
      "DRAFT is assigned on create only. ACTIVE makes this the client's current nutrition plan and archives any previous ACTIVE plan. ARCHIVED retires it. This endpoint does not restore DRAFT. Reactivating an ARCHIVED plan requires source Foods to still be ACTIVE.",
  })
  @IsEnum(NutritionPlanLifecycleStatus)
  status!: NutritionPlanLifecycleStatus;
}
