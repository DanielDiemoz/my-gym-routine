/**
 * Sistema di rank basato sul numero TOTALE di allenamenti completati
 * (storicamente, non su finestra temporale).
 *
 * I tier sono derivati: non memorizziamo nulla su DB, calcoliamo tutto
 * a partire dal conteggio delle sessioni completate.
 */

import recluta from "@/assets/ranks/recluta.webp";
import atleta from "@/assets/ranks/atleta.webp";
import guerriero from "@/assets/ranks/guerriero.webp";
import campione from "@/assets/ranks/campione.webp";
import maestro from "@/assets/ranks/maestro.webp";
import leggenda from "@/assets/ranks/leggenda.webp";

export type RankTier = {
  /** Indice del livello (0-based). */
  level: number;
  /** Nome localizzato: [italiano, inglese]. */
  name: [string, string];
  /** Numero minimo di allenamenti per ottenere questo rank. */
  threshold: number;
  /** Immagine decorativa del rank. */
  image: string;
};

/** Definizione dei 6 tier di rank. Ordinati per threshold crescente. */
export const RANK_TIERS: RankTier[] = [
  { level: 0, name: ["Recluta", "Recruit"], threshold: 0, image: recluta },
  { level: 1, name: ["Atleta", "Athlete"], threshold: 10, image: atleta },
  { level: 2, name: ["Guerriero", "Warrior"], threshold: 25, image: guerriero },
  { level: 3, name: ["Campione", "Champion"], threshold: 50, image: campione },
  { level: 4, name: ["Maestro", "Master"], threshold: 100, image: maestro },
  { level: 5, name: ["Leggenda", "Legend"], threshold: 200, image: leggenda },
];

export type RankInfo = {
  /** Tier corrente. */
  tier: RankTier;
  /** Numero totale di allenamenti. */
  totalWorkouts: number;
  /** Allenamenti rimanenti per salire al prossimo rank (0 se al massimo). */
  workoutsToNext: number;
  /** Soglia del prossimo rank (null se al massimo). */
  nextThreshold: number | null;
  /** Progresso 0..1 verso il prossimo rank (1 se al massimo). */
  progress: number;
};

/**
 * Calcola il rank a partire dal numero totale di allenamenti completati.
 */
export function getRank(totalWorkouts: number): RankInfo {
  const total = Math.max(0, Math.floor(totalWorkouts));

  let tier = RANK_TIERS[0];
  for (const candidate of RANK_TIERS) {
    if (total >= candidate.threshold) tier = candidate;
  }

  const tierIndex = RANK_TIERS.indexOf(tier);
  const next = RANK_TIERS[tierIndex + 1] ?? null;

  if (!next) {
    return {
      tier,
      totalWorkouts: total,
      workoutsToNext: 0,
      nextThreshold: null,
      progress: 1,
    };
  }

  const span = next.threshold - tier.threshold;
  const done = total - tier.threshold;
  const progress = span > 0 ? Math.min(done / span, 1) : 1;

  return {
    tier,
    totalWorkouts: total,
    workoutsToNext: Math.max(next.threshold - total, 0),
    nextThreshold: next.threshold,
    progress,
  };
}

/**
 * Restituisce il nome del rank nella lingua richiesta ("it" | "en").
 */
export function rankName(tier: RankTier, language: "it" | "en"): string {
  return language === "en" ? tier.name[1] : tier.name[0];
}

/**
 * Restituisce il nome del tier successivo a `level` (null se `level`
 * è l'ultimo). Utile per messaggi del tipo "mancano N allenamenti a <rank>".
 */
export function nextRankName(level: number, language: "it" | "en"): string | null {
  const next = RANK_TIERS[level + 1];
  return next ? rankName(next, language) : null;
}
