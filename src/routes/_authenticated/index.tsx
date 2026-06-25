import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  subDays,
  format,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  ChevronRight,
  LogOut,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { StreakCard } from "@/components/StreakCard";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

type SessionRow = {
  id: string;
  plan_id: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
  plan_name: string | null;
};
type LogRow = {
  muscle_group: string | null;
  reps: number;
  weight: number;
  session_id: string;
  created_at: string;
};

function Dashboard() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { display: fmtWeight } = useWeightUnit();

  const profileQ = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const plansQ = useQuery({
    queryKey: ["plans", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekQ = useQuery({
    queryKey: ["week-stats", user.id],
    queryFn: async () => {
      const now = new Date();
      const thisStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, plan_id, started_at, completed_at, total_volume, plan_name")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("started_at", lastStart.toISOString())
        .lte("started_at", thisEnd.toISOString())
        .order("started_at", { ascending: false });

      const sessionsArr = (sessions ?? []) as SessionRow[];
      const thisSessions = sessionsArr.filter((s) => new Date(s.started_at) >= thisStart);
      const lastSessions = sessionsArr.filter(
        (s) =>
          new Date(s.started_at) >= lastStart && new Date(s.started_at) <= lastEnd,
      );

      const thisVolume = thisSessions.reduce((s, x) => s + Number(x.total_volume), 0);
      const lastVolume = lastSessions.reduce((s, x) => s + Number(x.total_volume), 0);

      const sessionIds = thisSessions.map((s) => s.id);
      let logs: LogRow[] = [];
      if (sessionIds.length) {
        const { data } = await supabase
          .from("session_logs")
          .select("muscle_group, reps, weight, session_id, created_at")
          .in("session_id", sessionIds);
        logs = (data ?? []) as LogRow[];
      }

      const muscleMap = new Map<string, number>();
      logs.forEach((l) => {
        const m = l.muscle_group?.trim() || "Altro";
        muscleMap.set(m, (muscleMap.get(m) ?? 0) + 1);
      });
      const topMuscle = [...muscleMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      const days = eachDayOfInterval({ start: thisStart, end: thisEnd });
      const trainedDays = days.map((d) => ({
        date: d,
        trained: thisSessions.some((s) => isSameDay(new Date(s.started_at), d)),
      }));

      const change =
        lastVolume > 0
          ? ((thisVolume - lastVolume) / lastVolume) * 100
          : thisVolume > 0
            ? 100
            : 0;

      return {
        workouts: thisSessions.length,
        volume: thisVolume,
        topMuscle,
        change,
        days: trainedDays,
        recent: thisSessions.slice(0, 3),
      };
    },
  });

  // TASK 3 — streak: serve uno storico più ampio (365gg) rispetto a weekQ (~2 settimane).
  const streakQ = useQuery({
    queryKey: ["streak", user.id],
    queryFn: async () => {
      const since = subDays(new Date(), 365);
      const { data, error } = await supabase
        .from("sessions")
        .select("completed_at, total_volume")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", since.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  // TASK 3 — weekly_goal dalla profiles.weekly_goal (migration 20260624130000).
  // Cast esplicito perché il types.ts auto-generato potrebbe non avere ancora la colonna
  // dopo l'applicazione della migration; fallback a 3 (DEFAULT della colonna).
  const goalQ = useQuery({
    queryKey: ["weekly-goal", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("weekly_goal")
        .eq("id", user.id)
        .maybeSingle();
      const goal = data?.weekly_goal;
      return typeof goal === "number" && goal >= 1 && goal <= 7 ? goal : 3;
    },
  });

  const setGoal = useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase
        .from("profiles")
        .update({ weekly_goal: n })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: (_data, n) => {
      qc.invalidateQueries({ queryKey: ["weekly-goal", user.id] });
      toast.success(`Obiettivo settimanale impostato a ${n}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
    },
  });

  // TASK 4 — Skeleton gate su tutte le query principali (incluso profileQ).
  if (
    weekQ.isLoading ||
    plansQ.isLoading ||
    streakQ.isLoading ||
    goalQ.isLoading ||
    profileQ.isLoading
  ) {
    return <DashboardSkeleton />;
  }

  const name = profileQ.data?.display_name || profile?.display_name || "Atleta";
  const stats = weekQ.data;
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();

  async function deleteSession(id: string) {
    const ok = await confirmDialog(
      "Eliminare questo allenamento?",
      "I dati verranno rimossi definitivamente.",
    );
    if (!ok) return;
    await supabase.from("sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["week-stats", user.id] });
    toast.success("Allenamento eliminato");
  }

  return (
    <div className="container-app pt-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {format(new Date(), "EEEE d MMM", { locale: it })}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Ciao, {name.split(" ")[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <PWAInstallButton />
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="Esci"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Week ring */}
      <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">
          Questa settimana
        </p>
        <div className="mt-2 flex items-end justify-between">
          <div className="text-6xl font-black tracking-tighter">
            {stats?.workouts ?? 0}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-1.5">
          {stats?.days.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-9 w-full rounded-lg ${
                  d.trained ? "bg-primary-foreground" : "bg-primary-foreground/15"
                }`}
              />
              <span className="text-[10px] font-semibold uppercase opacity-60">
                {format(d.date, "EEEEE", { locale: it })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          label="Volume tot."
          value={fmtWeight(stats?.volume ?? 0)}
          trend={stats?.change ?? 0}
        />
        <StatCard
          label="Top muscolo"
          value={stats?.topMuscle ?? "—"}
          icon={<Flame className="h-4 w-4" />}
        />
      </section>

      {/* TASK 3 — Streak card */}
      <StreakCard
        sessions={(streakQ.data ?? []) as Array<{
          completed_at: string | null;
          total_volume: number;
        }>}
        weeklyGoal={goalQ.data ?? 3}
        weeklyCount={stats?.workouts ?? 0}
        onChangeGoal={(n) => setGoal.mutate(n)}
      />

      {/* Quick start */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Inizia un allenamento</h2>
          <Link to="/schede" className="text-xs font-semibold text-muted-foreground">
            Tutte →
          </Link>
        </div>
        {plansQ.data && plansQ.data.length === 0 ? (
          <Link
            to="/schede"
            className="block rounded-2xl border-2 border-dashed border-border p-6 text-center"
          >
            <Dumbbell className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">Crea la tua prima scheda</p>
          </Link>
        ) : (
          <div className="space-y-2">
            {plansQ.data?.map((p) => (
              <Link
                key={p.id}
                to="/allena/$planId"
                params={{ planId: p.id }}
                className="no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div className="font-semibold">{p.name}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {stats && stats.recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Recenti</h2>
          <div className="space-y-2">
            {stats.recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {s.plan_name ?? "Allenamento"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(s.started_at), "EEE d MMM", { locale: it })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-sm font-bold">
                    {fmtWeight(Number(s.total_volume), { digits: 0 })}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                        aria-label="Azioni"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate({
                            to: s.plan_id ? "/schede/$planId" : "/",
                            params: s.plan_id ? { planId: s.plan_id } : {},
                          })
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteSession(s.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {ConfirmDialog}
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  icon,
}: {
  label: string;
  value: string;
  trend?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight truncate">{value}</div>
      {trend !== undefined && (
        <div
          className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
            trend >= 0 ? "text-[oklch(0.55_0.16_145)]" : "text-destructive"
          }`}
        >
          {trend >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {trend >= 0 ? "+" : ""}
          {trend.toFixed(0)}% vs settimana scorsa
        </div>
      )}
    </div>
  );
}
