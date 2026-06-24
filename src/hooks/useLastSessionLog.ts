import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LastSessionLog = {
  reps: number;
  weight: number;
  created_at: string;
};

/**
 * Ritorna l'ultimo `session_logs` (reps/weight/created_at) per il dato nome esercizio.
 * - RLS filtra automaticamente per `auth.uid() = user_id`
 * - Cache 5 min (staleTime)
 * - Se l'esercizio non ha logs, ritorna null (utile per "Prima volta")
 */
export function useLastSessionLog(exerciseName: string | undefined) {
  return useQuery({
    queryKey: ["last-log", exerciseName ?? ""],
    queryFn: async (): Promise<LastSessionLog | null> => {
      if (!exerciseName) return null;
      const { data, error } = await supabase
        .from("session_logs")
        .select("reps, weight, created_at")
        .eq("exercise_name", exerciseName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!exerciseName,
    staleTime: 1000 * 60 * 5,
  });
}
