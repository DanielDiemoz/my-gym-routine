import { useQuery } from "@tanstack/react-query";
import { subDays, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizeMuscleGroup } from "@/lib/muscleMapping";

export type MuscleStimulusValue = {
  group: string;
  volume: number;
  sets: number;
};

export type MuscleStimulusData = {
  muscles: MuscleStimulusValue[];
  thresholds: [number, number, number, number]; // 4 soglie per 5 livelli
  maxValue: number;
};

export type Timeframe = "week" | "month" | "3months" | "6months";
export type StimulusMetric = "volume" | "sets";

/**
 * Soglie assolute basate sulle linee guida evidence-based.
 * Per le serie: 10-20 serie/muscolo/settimana è l'ottimale per ipertrofia.
 * Per il volume: stime basate su sessioni tipiche (compound ~3x10x40kg = 1200kg).
 *
 * Formato: [livello1, livello2, livello3, livello4]
 * I 5 livelli sono: 0=liveness, 1=basso, 2=medio, 3=alto, 4=molto alto, 5=massimo
 */
const ABSOLUTE_THRESHOLDS: Record<
  Timeframe,
  Record<StimulusMetric, [number, number, number, number]>
> = {
  week: {
    sets: [4, 10, 16, 22],
    volume: [500, 1500, 3000, 5000],
  },
  month: {
    sets: [16, 40, 64, 88],
    volume: [2000, 6000, 12000, 20000],
  },
  "3months": {
    sets: [48, 120, 192, 264],
    volume: [6000, 18000, 36000, 60000],
  },
  "6months": {
    sets: [96, 240, 384, 528],
    volume: [12000, 36000, 72000, 120000],
  },
};

function getDateSince(timeframe: Timeframe): Date {
  const now = new Date();
  switch (timeframe) {
    case "week":
      return subDays(now, 7);
    case "month":
      return subMonths(now, 1);
    case "3months":
      return subMonths(now, 3);
    case "6months":
      return subMonths(now, 6);
  }
}

export function useMuscleStimulusData(
  userId: string | undefined,
  timeframe: Timeframe = "month",
  metric: StimulusMetric = "volume",
) {
  return useQuery<MuscleStimulusData>({
    queryKey: ["muscleStimulus", userId, timeframe, metric],
    enabled: !!userId,
    queryFn: async () => {
      const since = getDateSince(timeframe);

      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", userId!)
        .not("completed_at", "is", null)
        .gte("completed_at", since.toISOString());

      if (sessionsError) throw sessionsError;

      const sessionIds = (sessions ?? []).map((s) => s.id);
      if (sessionIds.length === 0) {
        return {
          muscles: [],
          thresholds: [0, 0, 0, 0],
          maxValue: 0,
        };
      }

      const { data: logs, error: logsError } = await supabase
        .from("session_logs")
        .select("muscle_group, reps, weight")
        .in("session_id", sessionIds);

      if (logsError) throw logsError;

      const logRows = (logs ?? []) as Array<{
        muscle_group: string | null;
        reps: number;
        weight: number;
      }>;

      const grouped = new Map<string, { volume: number; sets: number }>();

      for (const log of logRows) {
        const group = normalizeMuscleGroup(log.muscle_group);
        const existing = grouped.get(group);
        const volume = log.reps * log.weight;
        if (existing) {
          existing.volume += volume;
          existing.sets += 1;
        } else {
          grouped.set(group, { volume, sets: 1 });
        }
      }

      const muscles: MuscleStimulusValue[] = [...grouped.entries()].map(([group, data]) => ({
        group,
        volume: data.volume,
        sets: data.sets,
      }));

      // Soglie assolute, non percentili
      const thresholds = ABSOLUTE_THRESHOLDS[timeframe][metric];
      const maxValue = Math.max(
        ...muscles.map((m) => (metric === "volume" ? m.volume : m.sets)),
        0,
      );

      return { muscles, thresholds, maxValue };
    },
    staleTime: 1000 * 60 * 5,
  });
}
