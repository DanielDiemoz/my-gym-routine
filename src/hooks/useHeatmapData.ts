import { useQuery } from "@tanstack/react-query";
import { subYears, format, startOfYear, endOfYear, eachDayOfInterval, getDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { EASTER_EGG_USER_ID, getEasterEggCells } from "@/lib/heatmapFont";

export type HeatmapDay = {
  date: string; // yyyy-MM-dd
  volume: number;
  count: number; // numero di sessioni quel giorno
};

export type HeatmapYear = {
  year: number;
  days: HeatmapDay[];
  totalCount: number;
};

export type HeatmapData = {
  years: HeatmapYear[];
  thresholds: [number, number, number]; // q25, q50, q75
};

function computePercentiles(values: number[]): [number, number, number] {
  if (values.length === 0) return [0, 0, 0];
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const idx = (p / 100) * (sorted.length - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    if (low === high) return sorted[low];
    return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
  };
  return [percentile(25), percentile(50), percentile(75)];
}

function groupByDay(
  sessions: Array<{ completed_at: string; total_volume: number }>,
): Map<string, { volume: number; count: number }> {
  const map = new Map<string, { volume: number; count: number }>();
  for (const s of sessions) {
    const day = format(new Date(s.completed_at), "yyyy-MM-dd");
    const existing = map.get(day);
    if (existing) {
      existing.volume += Number(s.total_volume);
      existing.count += 1;
    } else {
      map.set(day, { volume: Number(s.total_volume), count: 1 });
    }
  }
  return map;
}

export function useHeatmapData(userId: string | undefined) {
  return useQuery<HeatmapData>({
    queryKey: ["heatmap", userId],
    enabled: !!userId,
    queryFn: async () => {
      const since = subYears(new Date(), 3);
      const { data, error } = await supabase
        .from("sessions")
        .select("completed_at, total_volume")
        .eq("user_id", userId!)
        .not("completed_at", "is", null)
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: true });

      if (error) throw error;

      const sessions = (data ?? []) as Array<{
        completed_at: string;
        total_volume: number;
      }>;

      const byDay = groupByDay(sessions);
      const dailyVolumes = [...byDay.values()].map((d) => d.volume);
      const thresholds = computePercentiles(dailyVolumes);

      const now = new Date();
      const years: HeatmapYear[] = [];

      for (let y = 0; y < 3; y++) {
        const year = now.getFullYear() - y;
        const yearDays: HeatmapDay[] = [];

        for (const [date, { volume, count }] of byDay) {
          if (parseInt(date.slice(0, 4)) === year) {
            yearDays.push({ date, volume, count });
          }
        }

        yearDays.sort((a, b) => a.date.localeCompare(b.date));

        years.push({
          year,
          days: yearDays,
          totalCount: yearDays.reduce((s, d) => s + d.count, 0),
        });
      }

      // Easter egg: override heatmap to show pixel text for special user
      if (userId === EASTER_EGG_USER_ID) {
        const MS_PER_DAY = 86400000;

        for (const yearData of years) {
          const textGrid = getEasterEggCells(yearData.year);
          if (textGrid.size === 0) continue;

          const jan1 = startOfYear(new Date(yearData.year, 0, 1));
          const dec31 = endOfYear(new Date(yearData.year, 0, 1));
          const firstDow = (getDay(jan1) + 6) % 7;

          // Regenerate ALL days — text only, no real workout data
          const allDays = eachDayOfInterval({ start: jan1, end: dec31 });
          yearData.days = allDays.map((d) => {
            const dateKey = format(d, "yyyy-MM-dd");
            const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / MS_PER_DAY);
            const col = Math.floor((dayOfYear + firstDow) / 7);
            const row = (getDay(d) + 6) % 7;
            const lit = textGrid.has(`${col}-${row}`);
            return {
              date: dateKey,
              volume: lit ? 1 : 0,
              count: lit ? 1 : 0,
            };
          });
          yearData.totalCount = yearData.days.filter((d) => d.count > 0).length;
        }
      }

      return { years, thresholds };
    },
    staleTime: 1000 * 60 * 5,
  });
}
