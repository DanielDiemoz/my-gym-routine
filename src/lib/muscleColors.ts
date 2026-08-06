export const MUSCLE_COLORS: Record<string, string> = {
  Petto: "oklch(0.62 0.2 25)",
  Schiena: "oklch(0.6 0.15 250)",
  Gambe: "oklch(0.55 0.22 280)",
  Spalle: "oklch(0.75 0.15 80)",
  Braccia: "oklch(0.65 0.16 145)",
  Bicipiti: "oklch(0.65 0.16 145)",
  Tricipiti: "oklch(0.65 0.16 145)",
  Avambracci: "oklch(0.65 0.16 145)",
  Addome: "oklch(0.7 0.17 50)",
  Core: "oklch(0.7 0.12 200)",
  Glutei: "oklch(0.65 0.18 350)",
  Altro: "oklch(0.7 0 0)",
};

export function muscleColor(group?: string | null): string {
  return MUSCLE_COLORS[group?.trim() ?? "Altro"] ?? MUSCLE_COLORS.Altro;
}

// Traduzione IT→EN dei gruppi muscolari. I gruppi muscolari sono salvati in
// italiano nel DB (testo libero), quindi mappiamo i valori più comuni.
export const MUSCLE_EN: Record<string, string> = {
  Petto: "Chest",
  Schiena: "Back",
  Dorsali: "Back",
  Gambe: "Legs",
  Quadricipiti: "Quads",
  Femorali: "Hamstrings",
  Polpacci: "Calves",
  Spalle: "Shoulders",
  Braccia: "Arms",
  Bicipiti: "Biceps",
  Tricipiti: "Triceps",
  Avambracci: "Forearms",
  Addome: "Abs",
  Core: "Core",
  Glutei: "Glutes",
  Lombari: "Lower back",
  Cardio: "Cardio",
  "Full body": "Full body",
  Altro: "Other",
};

export function muscleEn(it?: string | null): string {
  if (!it) return "";
  const key = it.trim();
  return MUSCLE_EN[key] ?? key;
}
