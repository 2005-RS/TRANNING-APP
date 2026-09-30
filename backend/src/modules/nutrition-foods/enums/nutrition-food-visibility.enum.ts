/**
 * GLOBAL foods are the shared catalog (every professional, and clients for logging).
 * PRIVATE foods are only visible to their creator; a Client's own foods are also
 * visible to the Client's assigned Trainer through the nutrition journal.
 */
export enum NutritionFoodVisibility {
  GLOBAL = 'GLOBAL',
  PRIVATE = 'PRIVATE',
}
