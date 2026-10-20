export type TrainingTab = 'plan' | 'library' | 'history';

const trainingTabs = new Set<TrainingTab>(['plan', 'library', 'history']);

export function isTrainingTab(value: unknown): value is TrainingTab {
  return typeof value === 'string' && trainingTabs.has(value as TrainingTab);
}
