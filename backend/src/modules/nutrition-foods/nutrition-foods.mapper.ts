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
    source: food.source,
    externalId: food.externalId,
    sourceDataType: food.sourceDataType,
    importedAt: food.importedAt,
    nameOriginal: food.nameOriginal,
    nameOrigin: food.nameOrigin,
    nameVerifiedAt: food.nameVerifiedAt,
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
    nutrients: [...(food.foodNutrients ?? [])]
      .sort(
        (left, right) =>
          left.nutrient.displayOrder - right.nutrient.displayOrder ||
          left.nutrient.code.localeCompare(right.nutrient.code),
      )
      .map((foodNutrient) => ({
        code: foodNutrient.nutrient.code,
        nameEn: foodNutrient.nutrient.nameEn,
        nameEs: foodNutrient.nutrient.nameEs,
        unit: foodNutrient.nutrient.unit,
        category: foodNutrient.nutrient.category,
        amountPer100g:
          foodNutrient.amountPer100g === null ||
          foodNutrient.amountPer100g === undefined
            ? null
            : Number(foodNutrient.amountPer100g),
        derivation: foodNutrient.derivation,
        source: foodNutrient.source,
      })),
    portions: [...(food.portions ?? [])]
      .sort((left, right) => left.position - right.position)
      .map((portion) => ({
        id: portion.id,
        label: portion.label,
        gramWeight: Number(portion.gramWeight),
        isDefault: portion.isDefault,
      })),
    status: food.status,
    visibility: food.visibility,
    createdByUserId: food.createdByUserId,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
}
