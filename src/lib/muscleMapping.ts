import type { Slug } from "react-muscle-highlighter";

/**
 * Mapping delle etichette granulari dell'exercise_library ai 9 gruppi
 * muscolari principali definiti in muscleColors.ts.
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
 * Mapping dai 9 gruppi principali agli slug di react-muscle-highlighter.
 * Ogni gruppo può corrispondere a più regioni anatomiche.
 */
export const MAIN_TO_SLUGS: Record<string, Slug[]> = {
  Petto: ["chest"],
  Schiena: ["upper-back", "lower-back", "trapezius"],
  Gambe: ["quadriceps", "hamstring", "calves", "adductors", "tibialis"],
  Spalle: ["deltoids"],
  Braccia: ["biceps", "triceps", "forearm"],
  Addome: ["abs", "obliques"],
  Core: ["abs", "obliques"],
  Glutei: ["gluteal"],
  Altro: [],
};

/**
 * Scala monocromatica basata sul primary color (violet, hue 280).
 * 5 livelli da chiaro a scuro.
 */
export const MONOCHROMATIC_COLORS = [
  "#c4b5fd", // violet-300
  "#a78bfa", // violet-400
  "#8b5cf6", // violet-500 (≈ primary)
  "#7c3aed", // violet-600
  "#6d28d9", // violet-700
];
