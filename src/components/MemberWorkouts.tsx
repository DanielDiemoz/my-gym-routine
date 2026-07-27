import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Calendar } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { subDays, format, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutCard, type WorkoutLog } from "@/components/WorkoutCard";
import { useLanguage } from "@/lib/i18n";

export function MemberWorkouts({ circleId, userId }: { circleId: string; userId: string }) {
  const { t, dateLocale } = useLanguage();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  const q = useQuery({
    queryKey: ["member-workouts", circleId, userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      const sinceIso = subDays(new Date(), 365).toISOString();
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, plan_name, started_at, completed_at, total_volume")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false });

      const sessionIds = (sessions ?? []).map((s) => s.id);
      let logs: (WorkoutLog & { session_id: string })[] = [];
      if (sessionIds.length > 0) {
        const { data: logsData } = await supabase
          .from("session_logs")
          .select("session_id, exercise_name, set_number, reps, weight")
          .in("session_id", sessionIds);
        logs = (logsData ?? []) as typeof logs;
      }

      return {
        profile: profile as { display_name: string | null } | null,
        sessions: sessions ?? [],
        logs,
      };
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (q.isError) {
      console.error(q.error);
    }
  }, [q.isError, q.error]);

  const sessionsWithLogs = useMemo(() => {
    if (!q.data) return [];
    return q.data.sessions.map((s) => {
      return {
        session: { ...s },
        logs: q.data!.logs.filter((l) => l.session_id === s.id) as WorkoutLog[],
      };
    });
  }, [q.data]);

  // Estraiamo i mesi unici che hanno allenamenti
  const monthsWithWorkouts = useMemo(() => {
    const monthMap = new Map<string, Date>();
    for (const item of sessionsWithLogs) {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      const key = format(date, "yyyy-MM");
      if (!monthMap.has(key)) {
        monthMap.set(key, new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
    return Array.from(monthMap.values()).sort((a, b) => b.getTime() - a.getTime());
  }, [sessionsWithLogs]);

  // Imposta il mese selezionato di default
  useMemo(() => {
    if (selectedMonth === null && monthsWithWorkouts.length > 0) {
      const now = new Date();
      const currentMonthHasWorkouts = monthsWithWorkouts.some((m) => isSameMonth(m, now));
      setSelectedMonth(currentMonthHasWorkouts ? now : monthsWithWorkouts[0]);
    }
  }, [monthsWithWorkouts, selectedMonth]);

  // Filtriamo e raggruppiamo per settimana nel mese selezionato
  const weekGroups = useMemo(() => {
    if (!selectedMonth) return [];

    const monthSessions = sessionsWithLogs.filter((item) => {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      return isSameMonth(date, selectedMonth);
    });

    // Raggruppa per settimana
    const weekMap = new Map<string, typeof sessionsWithLogs>();
    for (const item of monthSessions) {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      if (!weekMap.has(key)) {
        weekMap.set(key, []);
      }
      weekMap.get(key)!.push(item);
    }

    // Ordina per settimana (più recente prima)
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, sessions]) => sessions);
  }, [sessionsWithLogs, selectedMonth]);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (q.isLoading) {
    return (
      <div className="container-app pt-6">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const memberName = q.data?.profile?.display_name?.trim() || t("Atleta", "Athlete");

  return (
    <div className="container-app pt-6">
      <div className="mb-6">
        <Link
          to="/app/cerchia/$circleId"
          params={{ circleId }}
          search={{ user: undefined }}
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> {t("Cerchia", "Circle")}
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
            {memberName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{memberName}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {q.data?.sessions.length ?? 0}{" "}
              {q.data?.sessions.length === 1
                ? t("allenamento", "workout")
                : t("allenamenti", "workouts")}
            </p>
          </div>
        </div>
      </div>

      {/* Bottoni Mesi */}
      <div className="mb-6 flex flex-wrap gap-2">
        {monthsWithWorkouts.map((month) => {
          const isSelected = selectedMonth && isSameMonth(month, selectedMonth);
          const monthSessions = sessionsWithLogs.filter((item) => {
            const date = new Date(item.session.completed_at ?? item.session.started_at);
            return isSameMonth(date, month);
          });
          return (
            <button
              key={format(month, "yyyy-MM")}
              onClick={() => setSelectedMonth(month)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <Calendar className="mr-1.5 inline h-4 w-4" />
              {format(month, "MMMM yyyy", { locale: dateLocale })}
              <span className="ml-1.5 text-xs opacity-70">({monthSessions.length})</span>
            </button>
          );
        })}
      </div>

      {/* Gruppi Settimana */}
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("Allenamenti", "Workouts")}</h2>
        {weekGroups.length === 0 && selectedMonth ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("Nessun allenamento in questo mese.", "No workouts this month.")}
          </p>
        ) : (
          weekGroups.map((weekSessions, weekIndex) => (
            <WeekGroup
              key={weekIndex}
              sessions={weekSessions}
              openId={openId}
              onToggle={handleToggle}
            />
          ))
        )}
      </section>
    </div>
  );
}

// Componente WeekGroup inline
function WeekGroup({
  sessions,
  openId,
  onToggle,
}: {
  sessions: {
    session: {
      id: string;
      plan_name: string | null;
      started_at: string;
      completed_at: string | null;
      total_volume: number;
    };
    logs: WorkoutLog[];
  }[];
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const { dateLocale } = useLanguage();

  if (sessions.length === 0) return null;

  const firstDate = new Date(sessions[0].session.completed_at ?? sessions[0].session.started_at);
  const weekStart = startOfWeek(firstDate, { weekStartsOn: 1, locale: dateLocale });
  const weekEnd = endOfWeek(firstDate, { weekStartsOn: 1, locale: dateLocale });

  const startStr = format(weekStart, "d MMM", { locale: dateLocale });
  const endStr = format(weekEnd, "d MMM", { locale: dateLocale });
  const sameMonth = format(weekStart, "yyyy-MM") === format(weekEnd, "yyyy-MM");

  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {sameMonth
          ? `${startStr} - ${format(weekEnd, "d MMMM yyyy", { locale: dateLocale })}`
          : `${startStr} - ${endStr}`}
      </div>
      <div className="space-y-2">
        {sessions.map((item) => (
          <WorkoutCard
            key={item.session.id}
            session={item.session}
            logs={item.logs}
            date={item.session.completed_at ?? item.session.started_at}
            isOpen={openId === item.session.id}
            onToggle={() => onToggle(item.session.id)}
          />
        ))}
      </div>
    </div>
  );
}
