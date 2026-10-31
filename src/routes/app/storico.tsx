import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { Calendar, Search, X } from "lucide-react";
import { WorkoutCard, type WorkoutLog } from "@/components/WorkoutCard";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { StoricoSkeleton } from "@/components/skeletons/StoricoSkeleton";
import { useWeightUnit } from "@/hooks/useWeightUnit";
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
  const { display: fmtWeight } = useWeightUnit();
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Sessioni del mese selezionato (filtrate anche per ricerca se presente)
  const monthSessionsFiltered = useMemo(() => {
    if (!selectedMonth) return [];
    const term = searchQuery.trim().toLowerCase();
    return sessionsWithLogs.filter((item) => {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      if (!isSameMonth(date, selectedMonth)) return false;
      if (!term) return true;
      const planMatch = (item.session.plan_name ?? "").toLowerCase().includes(term);
      const exMatch = item.logs.some((l) => l.exercise_name.toLowerCase().includes(term));
      return planMatch || exMatch;
    });
  }, [sessionsWithLogs, selectedMonth, searchQuery]);

  // Filtriamo e raggruppiamo per settimana nel mese selezionato
  const weekGroups = useMemo(() => {
    const weekMap = new Map<string, SessionWithLogs[]>();
    for (const item of monthSessionsFiltered) {
      const date = new Date(item.session.completed_at ?? item.session.started_at);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      if (!weekMap.has(key)) {
        weekMap.set(key, []);
      }
      weekMap.get(key)!.push(item);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekKey, sessions]) => ({
        weekKey,
        sessions,
        volume: sessions.reduce((acc, s) => acc + Number(s.session.total_volume), 0),
      }));
  }, [monthSessionsFiltered]);

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
      <div className="container-app pt-safe-lg">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Cronologia", "History")}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t("Storico", "History")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsSheet userId={user.id} />
            <ProfileMenu userId={user.id} />
          </div>
        </header>

        <div className="bento-card flex flex-col items-center justify-center rounded-3xl py-20 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/12 text-primary">
            <Calendar className="h-10 w-10" strokeWidth={1.75} />
          </div>
          <p className="mt-5 text-base font-extrabold">
            {t("Nessun allenamento ancora", "No workouts yet")}
          </p>
          <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
            {t(
              "Avvia un allenamento e completalo per vedere qui la cronologia dei tuoi progressi.",
              "Start a workout and complete it to see your progress history here.",
            )}
          </p>
        </div>
      </div>
    );
  }

  const monthTotalWorkouts = monthSessionsFiltered.length;
  const monthTotalVolume = monthSessionsFiltered.reduce(
    (acc, s) => acc + Number(s.session.total_volume),
    0,
  );
  const monthTotalSets = monthSessionsFiltered.reduce((acc, s) => acc + s.logs.length, 0);

  // Per il mini-chart settimanale ordiniamo cronologicamente da sinistra a destra
  const chartWeeks = [...weekGroups].reverse();
  const maxWeekVol = Math.max(...chartWeeks.map((w) => w.volume), 1);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="container-app pt-safe-lg">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("Cronologia", "History")}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t("Storico", "History")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsSheet userId={user.id} />
          <ProfileMenu userId={user.id} />
        </div>
      </header>

      {/* Pillole Mesi */}
      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className={`no-tap-highlight flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-extrabold capitalize transition active:scale-95 ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              {format(month, "MMMM yyyy", { locale: dateLocale })}
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                  isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {monthSessions.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bento Summary & Weekly Volume Chart */}
      {selectedMonth && (
        <div className="bento-card mb-5 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: dateLocale })}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Sessioni", "Workouts")}
              </div>
              <div className="mt-1 text-xl font-black tabular-nums">{monthTotalWorkouts}</div>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Volume", "Volume")}
              </div>
              <div className="mt-1 text-lg sm:text-xl font-black tabular-nums truncate text-primary">
                {fmtWeight(monthTotalVolume, { digits: 0 })}
              </div>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Serie tot.", "Total sets")}
              </div>
              <div className="mt-1 text-xl font-black tabular-nums">{monthTotalSets}</div>
            </div>
          </div>

          {chartWeeks.length > 1 && (
            <div className="mt-4 pt-3.5 border-t border-border/60">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span>{t("Andamento volume settimanale", "Weekly volume trend")}</span>
              </div>
              <div className="flex h-16 items-end gap-2">
                {chartWeeks.map((w) => {
                  const pct = Math.max(14, Math.round((w.volume / maxWeekVol) * 100));
                  const label = format(new Date(w.weekKey), "d MMM", { locale: dateLocale });
                  return (
                    <div key={w.weekKey} className="flex flex-1 flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-primary/70 to-primary transition-all"
                          style={{ height: `${pct}%` }}
                          title={`${label}: ${fmtWeight(w.volume, { digits: 0 })}`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground tabular-nums">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search / Filter input */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(
            "Filtra per scheda o esercizio…",
            "Filter by plan or exercise…",
          )}
          className="w-full rounded-2xl border border-border bg-card py-2.5 pl-10 pr-9 text-xs font-semibold outline-none transition focus:border-primary"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label={t("Pulisci ricerca", "Clear search")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Gruppi Settimana */}
      <section className="space-y-5">
        {weekGroups.map((group) => (
          <WeekGroup
            key={group.weekKey}
            sessions={group.sessions}
            openId={openId}
            onToggle={handleToggle}
          />
        ))}
        {weekGroups.length === 0 && selectedMonth && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("Nessun allenamento trovato.", "No workouts found.")}
          </p>
        )}
      </section>
    </div>
  );
}

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
    <div>
      <div className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {sameMonth
          ? `${startStr} – ${format(weekEnd, "d MMMM yyyy", { locale: dateLocale })}`
          : `${startStr} – ${endStr}`}
      </div>
      <div className="space-y-2.5">
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
