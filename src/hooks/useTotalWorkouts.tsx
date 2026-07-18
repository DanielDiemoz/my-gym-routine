import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Restituisce il numero TOTALE di allenamenti completati da un utente
 * (storicamente, non su finestra temporale). Usato per il sistema di rank.
 */
export function useTotalWorkouts(userId: string | undefined) {
  return useQuery({
    queryKey: ["total-workouts", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("completed_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60,
  });
}
