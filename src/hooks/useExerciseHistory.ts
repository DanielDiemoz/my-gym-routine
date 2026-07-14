import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HistorySet = {
  setNumber: number;
  reps: number;
  weight: number;
};

export type ExerciseHistoryEntry = {
  sessionId: string;
  date: string;
  sets: HistorySet[];
};

const MAX_SESSIONS = 3;

/**
 * Ritorna le ultime sessioni (max 3) in cui è stato registrato l'esercizio dato,
 * raggruppate per sessione e ordinate dalla più recente.
 * - RLS filtra automaticamente per `auth.uid() = user_id`
 * - Se l'esercizio non ha mai log, ritorna un array vuoto (→ non mostrare nulla)
 */
export function useExerciseHistory(exerciseName: string | undefined) {
  return useQuery({
    queryKey: ["exercise-history", exerciseName ?? ""],
    queryFn: async (): Promise<ExerciseHistoryEntry[]> => {
      if (!exerciseName) return [];
      const { data, error } = await supabase
        .from("session_logs")
        .select("session_id, set_number, reps, weight, created_at")
        .eq("exercise_name", exerciseName)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      if (!data) return [];

      const map = new Map<string, ExerciseHistoryEntry>();
      for (const row of data) {
        let entry = map.get(row.session_id);
        if (!entry) {
          if (map.size >= MAX_SESSIONS) continue;
          entry = { sessionId: row.session_id, date: row.created_at, sets: [] };
          map.set(row.session_id, entry);
        }
        entry.sets.push({
          setNumber: row.set_number,
          reps: row.reps,
          weight: Number(row.weight),
        });
      }

      const entries = [...map.values()];
      for (const e of entries) {
        e.sets.sort((a, b) => a.setNumber - b.setNumber);
      }
      return entries;
    },
    enabled: !!exerciseName,
    staleTime: 1000 * 60 * 5,
  });
}
