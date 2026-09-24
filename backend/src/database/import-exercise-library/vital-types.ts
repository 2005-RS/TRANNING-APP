export type VitalExerciseRecord = {
  exerciseId?: string;
  id?: string;
  name?: string;
  bodyPart?: string;
  equipment?: string;
  target?: string;
  secondaryMuscles?: string[] | string;
  difficulty?: string;
  category?: string;
  description?: string;
  instructions?: string[] | string;
  gifUrl?: string;
  video?: string;
  videoUrl?: string;
  animation?: string;
  file?: string;
};

export type MappedVitalExercise = {
  sourceId: string;
  name: string;
  description: string | null;
  instructions: string | null;
  primaryMuscleGroup: string;
  equipmentType: string;
  difficultyLevel: string;
  animationPath: string | null;
  skippedReason?: string;
};
