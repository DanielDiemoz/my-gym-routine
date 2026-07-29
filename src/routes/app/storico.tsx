import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Calendar } from "lucide-react";
import { WorkoutCard, type WorkoutLog } from "@/components/WorkoutCard";
import { ProfileMenu } from "@/components/ProfileMenu";
import { StoricoSkeleton } from "@/components/skeletons/StoricoSkeleton";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/storico")({
  component: Storico,
});

type Session = {
  id: string;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
};

function Storico() {
  const { user } = Route.useRouteContext();
  const { t, dateLocale } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Carichiamo gli ultimi 6 mesi di dati per avere una buona copertura
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

  const q = useQuery({
    queryKey: ["history", user.id, sixMonthsAgo.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, plan_name, started_at, completed_at, total_volume")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("started_at", sixMonthsAgo.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const sessionIds = (q.data ?? []).map((s) => s.id);

  const logsQ = useQuery({
    queryKey: ["history-logs", user.id, sixMonthsAgo.toISOString()],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_logs")
        .select("session_id, exercise_name, set_number, reps, weight")
        .in("session_id", sessionIds);
      if (error) throw error;
      return (data ?? []) as (WorkoutLog & { session_id: string })[];
    },
  });

  const sessionsWithLogs = useMemo(() => {
    const logs = logsQ.data ?? [];
    return (q.data ?? []).map((s) => ({
      session: s,
      logs: logs.filter((l) => l.session_id === s.id) as WorkoutLog[],
    }));
  }, [q.data, logsQ.data]);

  // Estraiamo i mesi unici che hanno allenamenti
  const monthsWithWorkouts = useMemo(() => {
    const monthMap = new Map<string, Date>();
    for (const item of sessionsWithLogs) {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      const key = format(date, "yyyy-MM");
      if (!monthMap.has(key)) {
        monthMap.set(key, startOfMonth(date));
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
    const weekMap = new Map<string, SessionWithLogs[]>();
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

  type SessionWithLogs = (typeof sessionsWithLogs)[number];

  if (q.isLoading) {
    return <StoricoSkeleton />;
  }

  if (q.isError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            "Impossibile caricare lo storico. Controlla la connessione e riprova.",
            "Unable to load history. Check your connection and try again.",
          )}
        </p>
        <button
          onClick={() => {
            q.refetch();
          }}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("Riprova", "Retry")}
        </button>
      </div>
    );
  }

  if ((q.data ?? []).length === 0) {
    return (
      <div className="container-app pt-10">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("Cronologia", "History")}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">{t("Storico", "History")}</h1>
          </div>
          <ProfileMenu />
        </header>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-base font-semibold">
            {t("Nessun allenamento ancora", "No workouts yet")}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t(
              "Avvia un allenamento e completalo per vedere qui la cronologia dei tuoi progressi.",
              "Start a workout and complete it to see your progress history here.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const totalVolume = (q.data ?? []).reduce((s, x) => s + Number(x.total_volume), 0);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="container-app pt-10">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t("Cronologia", "History")}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{t("Storico", "History")}</h1>
        </div>
        <ProfileMenu />
      </header>

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

      {/* Statistiche mese selezionato */}
      {selectedMonth && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold capitalize">
                {format(selectedMonth, "MMMM yyyy", { locale: dateLocale })}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {weekGroups.reduce((acc, week) => acc + week.length, 0)}{" "}
                {t("allenamenti", "workouts")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gruppi Settimana */}
      <section>
        {weekGroups.map((weekSessions, weekIndex) => (
          <WeekGroup
            key={weekIndex}
            sessions={weekSessions}
            openId={openId}
            onToggle={handleToggle}
          />
        ))}
        {weekGroups.length === 0 && selectedMonth && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("Nessun allenamento in questo mese.", "No workouts this month.")}
          </p>
        )}
      </section>
    </div>
  );
}

// Componente WeekGroup inline per evitare import circolari
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
