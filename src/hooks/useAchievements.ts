import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { subDays, getHours, differenceInCalendarDays, startOfDay } from "date-fns";

export type Achievement = {
  id: string;
  name: { it: string; en: string };
  description: { it: string; en: string };
  icon: string;
  category: "workouts" | "streak" | "volume" | "special";
  unlocked: boolean;
  progress: number;
  target: number;
};

type SessionRow = {
  completed_at: string | null;
  total_volume: number;
};

function computeAchievements(sessions: SessionRow[]): Achievement[] {
  const completed = sessions.filter((s) => s.completed_at !== null) as {
    completed_at: string;
    total_volume: number;
  }[];
  const totalWorkouts = completed.length;
  const totalVolume = completed.reduce((sum, s) => sum + Number(s.total_volume), 0);

  // Calculate best streak
  const dates = [
    ...new Set(
      completed.map((s) => {
        const d = new Date(s.completed_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }),
    ),
  ]
    .sort()
    .reverse();

  let bestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = differenceInCalendarDays(prev, curr);
      if (diff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  // Count workouts before 8am and after 9pm
  let mattiniero = false;
  let notturno = false;
  for (const s of completed) {
    const hour = getHour(new Date(s.completed_at));
    if (hour < 8) mattiniero = true;
    if (hour >= 21) notturno = true;
  }

  // Check if any week had 3+ sessions
  const weekMap = new Map<string, number>();
  for (const s of completed) {
    const d = new Date(s.completed_at);
    const weekStart = startOfDay(d);
    const key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${Math.floor(weekStart.getDate() / 7)}`;
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }
  const costante = [...weekMap.values()].some((c) => c >= 3);

  const achievements: Achievement[] = [
    // Workouts
    {
      id: "first-workout",
      name: { it: "Primo passo", en: "First step" },
      description: { it: "Completa il tuo primo allenamento", en: "Complete your first workout" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 1,
      progress: Math.min(totalWorkouts, 1),
      target: 1,
    },
    {
      id: "5-workouts",
      name: { it: "Costante", en: "Consistent" },
      description: { it: "Completa 5 allenamenti", en: "Complete 5 workouts" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 5,
      progress: Math.min(totalWorkouts, 5),
      target: 5,
    },
    {
      id: "10-workouts",
      name: { it: "Appassionato", en: "Enthusiast" },
      description: { it: "Completa 10 allenamenti", en: "Complete 10 workouts" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 10,
      progress: Math.min(totalWorkouts, 10),
      target: 10,
    },
    {
      id: "25-workouts",
      name: { it: "Dedicato", en: "Dedicated" },
      description: { it: "Completa 25 allenamenti", en: "Complete 25 workouts" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 25,
      progress: Math.min(totalWorkouts, 25),
      target: 25,
    },
    {
      id: "50-workouts",
      name: { it: "Forza bruta", en: "Beast mode" },
      description: { it: "Completa 50 allenamenti", en: "Complete 50 workouts" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 50,
      progress: Math.min(totalWorkouts, 50),
      target: 50,
    },
    {
      id: "100-workouts",
      name: { it: "Leggenda", en: "Legend" },
      description: { it: "Completa 100 allenamenti", en: "Complete 100 workouts" },
      icon: "🏅",
      category: "workouts",
      unlocked: totalWorkouts >= 100,
      progress: Math.min(totalWorkouts, 100),
      target: 100,
    },
    // Streak
    {
      id: "streak-7",
      name: { it: "Fuoco", en: "On fire" },
      description: { it: "Streak di 7 giorni", en: "7 day streak" },
      icon: "🔥",
      category: "streak",
      unlocked: bestStreak >= 7,
      progress: Math.min(bestStreak, 7),
      target: 7,
    },
    {
      id: "streak-14",
      name: { it: "Imparabile", en: "Unstoppable" },
      description: { it: "Streak di 14 giorni", en: "14 day streak" },
      icon: "🔥",
      category: "streak",
      unlocked: bestStreak >= 14,
      progress: Math.min(bestStreak, 14),
      target: 14,
    },
    {
      id: "streak-30",
      name: { it: "Dominatore", en: "Dominator" },
      description: { it: "Streak di 30 giorni", en: "30 day streak" },
      icon: "🔥",
      category: "streak",
      unlocked: bestStreak >= 30,
      progress: Math.min(bestStreak, 30),
      target: 30,
    },
    // Volume
    {
      id: "volume-1k",
      name: { it: "Potente", en: "Powerful" },
      description: { it: "Solleva 1.000 kg totali", en: "Lift 1,000 kg total" },
      icon: "💪",
      category: "volume",
      unlocked: totalVolume >= 1000,
      progress: Math.min(totalVolume, 1000),
      target: 1000,
    },
    {
      id: "volume-10k",
      name: { it: "Macchina", en: "Machine" },
      description: { it: "Solleva 10.000 kg totali", en: "Lift 10,000 kg total" },
      icon: "💪",
      category: "volume",
      unlocked: totalVolume >= 10000,
      progress: Math.min(totalVolume, 10000),
      target: 10000,
    },
    {
      id: "volume-100k",
      name: { it: "Mitico", en: "Mythical" },
      description: { it: "Solleva 100.000 kg totali", en: "Lift 100,000 kg total" },
      icon: "💪",
      category: "volume",
      unlocked: totalVolume >= 100000,
      progress: Math.min(totalVolume, 100000),
      target: 100000,
    },
    // Special
    {
      id: "mattiniero",
      name: { it: "Mattiniero", en: "Early bird" },
      description: { it: "Allénati prima delle 8:00", en: "Workout before 8:00 AM" },
      icon: "⭐",
      category: "special",
      unlocked: mattiniero,
      progress: mattiniero ? 1 : 0,
      target: 1,
    },
    {
      id: "notturno",
      name: { it: "Notturno", en: "Night owl" },
      description: { it: "Allénati dopo le 21:00", en: "Workout after 9:00 PM" },
      icon: "🌙",
      category: "special",
      unlocked: notturno,
      progress: notturno ? 1 : 0,
      target: 1,
    },
    {
      id: "costante",
      name: { it: "Costante", en: "Committed" },
      description: { it: "3+ sessioni in una settimana", en: "3+ sessions in one week" },
      icon: "🎯",
      category: "special",
      unlocked: costante,
      progress: costante ? 1 : 0,
      target: 1,
    },
  ];

  return achievements;
}

export function useAchievements(userId: string) {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      const since = subDays(new Date(), 365).toISOString();
      const { data, error } = await supabase
        .from("sessions")
        .select("completed_at, total_volume")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("completed_at", since);
      if (error) throw error;
      return computeAchievements((data ?? []) as SessionRow[]);
    },
    staleTime: 1000 * 60,
  });
}
