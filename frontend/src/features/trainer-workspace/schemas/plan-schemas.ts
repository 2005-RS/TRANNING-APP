import { z } from 'zod';
import { trainerWorkspaceCopy } from '@/features/trainer-workspace/copy';

export const namedPlanSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(2000),
  startDate: z.string(),
  endDate: z.string(),
});

export const nutritionTargetsSchema = namedPlanSchema.extend({
  targetCaloriesKcal: z.string(),
  targetProteinG: z.string(),
  targetCarbohydratesG: z.string(),
  targetFatG: z.string(),
});

export function getTemplateSchema() {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, trainerWorkspaceCopy.templates.nameRequired)
      .max(150),
    description: z.string().max(2000),
  });
}

export const templateSchema = {
  safeParse: (value: unknown) => getTemplateSchema().safeParse(value),
  parse: (value: unknown) => getTemplateSchema().parse(value),
};

export const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(2000),
  instructions: z.string().max(5000),
  primaryMuscleGroup: z.string().min(1),
  equipmentType: z.string().min(1),
  difficultyLevel: z.string().min(1),
});

export const foodSchema = z.object({
  name: z.string().trim().min(2).max(150),
  brand: z.string().max(150),
  caloriesPer100g: z.string().min(1),
  proteinGPer100g: z.string().min(1),
  carbohydratesGPer100g: z.string().min(1),
  fatGPer100g: z.string().min(1),
  fiberGPer100g: z.string(),
});
