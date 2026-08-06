/**
 * Determina automaticamente il muscle_group basandosi sul nome dell'esercizio.
 * Utilizzato quando l'utente inserisce manualmente un esercizio.
 */

const BICEPS_PATTERNS = [/curl/i, /bicipiti/i, /hammer/i, /preacher/i, /concentration/i];

const TRICEPS_PATTERNS = [
  /french\s*press/i,
  /push\s*down/i,
  /pushdown/i,
  /skull\s*crusher/i,
  /dip/i,
  /parallele/i,
  /estensioni/i,
  /tricipiti/i,
  /overhead.*extension/i,
  /close.*grip/i,
];

const FOREARMS_PATTERNS = [/avambracci/i, /wrist\s*curl/i, /reverse\s*curl/i, /grip/i];

export function inferMuscleGroup(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Check biceps patterns
  for (const pattern of BICEPS_PATTERNS) {
    if (pattern.test(trimmed)) return "Bicipiti";
  }

  // Check triceps patterns
  for (const pattern of TRICEPS_PATTERNS) {
    if (pattern.test(trimmed)) return "Tricipiti";
  }

  // Check forearms patterns
  for (const pattern of FOREARMS_PATTERNS) {
    if (pattern.test(trimmed)) return "Avambracci";
  }

  return null;
}
