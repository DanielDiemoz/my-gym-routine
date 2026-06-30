const MET_WEIGHTLIFTING = 5.0;
const DEFAULT_WEIGHT_KG = 70;

export function estimateCalories(weightKg: number, durationMinutes: number): number {
  const hours = durationMinutes / 60;
  return Math.round(MET_WEIGHTLIFTING * weightKg * hours);
}

export function formatCalories(cal: number): string {
  return `${cal.toLocaleString("it-IT")} kcal`;
}

export function formatVolume(vol: number): string {
  return `${Math.round(vol).toLocaleString("it-IT")} kg`;
}

export function getWeightOrDefault(profileWeight: number | null | undefined): number {
  return profileWeight ?? DEFAULT_WEIGHT_KG;
}
