import { NutritionFoodResponseDto } from './dto/nutrition-food-response.dto';
import { NutritionFood } from './entities/nutrition-food.entity';

export function toNutritionFoodResponse(
  food: NutritionFood,
): NutritionFoodResponseDto {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    description: food.description,
    nutritionPer100g: {
      caloriesKcal: Number(food.caloriesPer100g),
      proteinG: Number(food.proteinGPer100g),
      carbohydratesG: Number(food.carbohydratesGPer100g),
      fatG: Number(food.fatGPer100g),
      fiberG:
        food.fiberGPer100g === null || food.fiberGPer100g === undefined
          ? null
          : Number(food.fiberGPer100g),
    },
    status: food.status,
    createdByUserId: food.createdByUserId,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
}
