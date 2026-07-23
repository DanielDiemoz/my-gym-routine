import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

type LogRow = {
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
};

export type ExercisePR = {
  exercise: string;
  maxWeight: number;
  date: string;
  estimated1RM: number;
  totalSets: number;
  history: { weight: number; reps: number; date: string }[];
};

function computePRs(logs: LogRow[]): ExercisePR[] {
  const byExercise = new Map<string, LogRow[]>();

  for (const log of logs) {
    const name = log.exercise_name.trim();
    if (!name) continue;
    if (!byExercise.has(name)) byExercise.set(name, []);
    byExercise.get(name)!.push(log);
  }

  const prs: ExercisePR[] = [];

  for (const [exercise, entries] of byExercise) {
    // Sort by weight desc, then by date desc
    entries.sort((a, b) => b.weight - a.weight || b.created_at.localeCompare(a.created_at));

    const topEntry = entries[0];
    const maxWeight = topEntry.weight;

    // Estimated 1RM using Epley formula: weight × (1 + reps/30)
    // Only for sets with reps <= 10 (reasonable range for 1RM estimation)
    let estimated1RM = maxWeight;
    for (const e of entries) {
      if (e.reps <= 10 && e.reps > 0) {
        const e1rm = e.weight * (1 + e.reps / 30);
        if (e1rm > estimated1RM) {
          estimated1RM = e1rm;
        }
      }
    }

    // History: last 5 unique weights (deduplicated, most recent first)
    const seen = new Set<string>();
    const history: { weight: number; reps: number; date: string }[] = [];
    const sortedByDate = [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const e of sortedByDate) {
      const key = `${e.weight}`;
      if (!seen.has(key)) {
        seen.add(key);
        history.push({ weight: e.weight, reps: e.reps, date: e.created_at });
        if (history.length >= 5) break;
      }
    }

    prs.push({
      exercise,
      maxWeight,
      date: topEntry.created_at,
      estimated1RM: Math.round(estimated1RM),
      totalSets: entries.length,
      history,
    });
  }

  // Sort by max weight descending
  prs.sort((a, b) => b.maxWeight - a.maxWeight);

  return prs;
}

export function usePersonalRecords(userId: string) {
  return useQuery({
    queryKey: ["personal-records", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("exercise_name, weight, reps, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return computePRs((data ?? []) as LogRow[]);
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Check if a given set is a new PR for that exercise.
 * Returns the old PR weight (0 if first time) and whether it's a new PR.
 */
export function isNewPR(
  exerciseName: string,
  weight: number,
  currentPRs: ExercisePR[]
): { isNew: boolean; oldPR: number } {
  const pr = currentPRs.find(
    (p) => p.exercise.toLowerCase() === exerciseName.toLowerCase()
  );
  if (!pr) return { isNew: weight > 0, oldPR: 0 };
  return { isNew: weight > pr.maxWeight, oldPR: pr.maxWeight };
}
