export enum FoodLogEntryStatus {
  EATEN = 'EATEN',
  SKIPPED = 'SKIPPED',
}

/** How a prescribed plan item was resolved on a given day (derived, not stored). */
export enum PlannedItemStatus {
  PENDING = 'PENDING',
  EATEN = 'EATEN',
  REPLACED = 'REPLACED',
  SKIPPED = 'SKIPPED',
}
