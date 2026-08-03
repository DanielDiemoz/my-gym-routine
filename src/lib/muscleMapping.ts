import type { MuscleGroup } from "@musclemap/core";

/**
 * Mapping delle etichette granulari dell'exercise_library ai 9 gruppi
 * muscolari principali.
 */
export const FINE_TO_MAIN: Record<string, string> = {
  Pettorali: "Petto",
  "Pettorali superiori": "Petto",
  "Pettorali inferiori": "Petto",

  Dorsali: "Schiena",
  Lombari: "Schiena",

  Quadricipiti: "Gambe",
  "Posteriori coscia": "Gambe",
  Femorali: "Gambe",
  Polpacci: "Gambe",
  "Interno coscia": "Gambe",

  Deltoidi: "Spalle",
  "Deltoidi anteriori": "Spalle",
  "Deltoidi posteriori": "Spalle",

  Bicipiti: "Braccia",
  Tricipiti: "Braccia",
  Avambracci: "Braccia",

  Obliqui: "Addome",
  "Addome basso": "Addome",

  Glutei: "Glutei",
  "Glutei medi": "Glutei",
  "Glutei medio": "Glutei",

  Cardio: "Altro",
  "Full body": "Altro",
};

/**
 * Normalizza un'etichetta muscle_group dal DB al gruppo principale.
 */
export function normalizeMuscleGroup(raw?: string | null): string {
  if (!raw) return "Altro";
  const trimmed = raw.trim();
  if (FINE_TO_MAIN[trimmed]) return FINE_TO_MAIN[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(FINE_TO_MAIN)) {
    if (key.toLowerCase() === lower) return val;
  }
  return trimmed;
}

/**
 * Mapping dai 9 gruppi principali ai MuscleGroup di @musclemap/core.
 * Ogni gruppo italiano può attivare più MuscleGroup.
 */
export const MAIN_TO_MUSCLEMAP: Record<string, MuscleGroup[]> = {
  Petto: ["CHEST"],
  Schiena: ["TRAPEZIUS", "LATS", "BACK_UPPER", "BACK_LOWER"],
  Gambe: ["QUADS", "HAMSTRINGS", "CALVES", "ADDUCTORS"],
  Spalle: ["SHOULDERS_FRONT", "SHOULDERS_SIDE", "SHOULDERS_REAR"],
  Braccia: ["BICEPS", "TRICEPS", "FOREARMS"],
  Addome: ["CORE", "OBLIQUES"],
  Core: ["CORE", "OBLIQUES"],
  Glutei: ["GLUTES"],
  Altro: [],
};

/**
 * Converte un valore raw (volume o sets) in uno score MuscleMap 0-100.
 * Usa le soglie per mappare i 5 livelli di intensità su una scala continua.
 */
export function toMuscleMapScore(
  rawValue: number,
  thresholds: [number, number, number, number],
): number {
  if (rawValue === 0) return 0;
  if (rawValue <= thresholds[0]) return 20;
  if (rawValue <= thresholds[1]) return 40;
  if (rawValue <= thresholds[2]) return 60;
  if (rawValue <= thresholds[3]) return 80;
  return 100;
}
