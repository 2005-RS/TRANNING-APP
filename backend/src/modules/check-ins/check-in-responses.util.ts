export type CheckInResponseValues = {
  sleepQuality: number | null;
  energyLevel: number | null;
  stressLevel: number | null;
  hungerLevel: number | null;
  recoveryLevel: number | null;
  trainingAdherencePct: number | null;
  nutritionAdherencePct: number | null;
  wins: string | null;
  challenges: string | null;
  generalNotes: string | null;
};

export function hasSubstantiveCheckInResponse(
  values: CheckInResponseValues,
): boolean {
  return (
    values.sleepQuality !== null ||
    values.energyLevel !== null ||
    values.stressLevel !== null ||
    values.hungerLevel !== null ||
    values.recoveryLevel !== null ||
    values.trainingAdherencePct !== null ||
    values.nutritionAdherencePct !== null ||
    values.wins !== null ||
    values.challenges !== null ||
    values.generalNotes !== null
  );
}
