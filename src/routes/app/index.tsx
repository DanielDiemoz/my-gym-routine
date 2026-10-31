import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Trophy,
  BarChart3,
  Activity,
  Check,
  Play,
  Plus,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { UnreadDirectMessageBanner } from "@/components/UnreadDirectMessageBanner";
import { StreakCard } from "@/components/StreakCard";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useLanguage } from "@/lib/i18n";
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { WorkoutCalendar } from "@/components/WorkoutCalendar";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";

export const Route = createFileRoute("/app/")({
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

function getSessionGreeting(t: (it: string, en: string) => string, name: string) {
  const h = new Date().getHours();
  const period =
    h >= 5 && h < 12
      ? { it: "mattutina", en: "morning" }
      : h >= 12 && h < 18
        ? { it: "pomeridiana", en: "afternoon" }
        : h >= 18 && h < 22
          ? { it: "serale", en: "evening" }
          : { it: "notturna", en: "night" };
  return `${t("Sessione", "Session")} ${t(period.it, period.en)}, ${name}?`;
}

function Dashboard() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { display: fmtWeight } = useWeightUnit();
  const { t, dateLocale } = useLanguage();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return data as { display_name: string | null; avatar_url: string | null } | null;
    },
  });

  const plansQ = useQuery({
    queryKey: ["plans", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, exercises(count)")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
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
        (s) => new Date(s.started_at) >= lastStart && new Date(s.started_at) <= lastEnd,
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
      const sortedMuscles = [...muscleMap.entries()].sort((a, b) => b[1] - a[1]);
      const topMuscle = sortedMuscles[0]?.[0] ?? "—";
      const topMuscleSets = sortedMuscles[0]?.[1] ?? 0;

      const days = eachDayOfInterval({ start: thisStart, end: thisEnd });
      const trainedDays = days.map((d) => ({
        date: d,
        trained: thisSessions.some((s) => isSameDay(new Date(s.started_at), d)),
      }));

      const volumeChange =
        lastVolume > 0 ? ((thisVolume - lastVolume) / lastVolume) * 100 : thisVolume > 0 ? 100 : 0;

      const recent = thisSessions.slice(0, 3).map((s) => ({
        ...s,
      }));

      return {
        workouts: thisSessions.length,
        volume: thisVolume,
        topMuscle,
        topMuscleSets,
        totalSets: logs.length,
        topMusclesList: sortedMuscles.slice(0, 3),
        volumeChange,
        days: trainedDays,
        recent,
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
      toast.success(t(`Obiettivo settimanale impostato a ${n}`, `Weekly goal set to ${n}`));
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("Errore nel salvataggio", "Save error"));
    },
  });

  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();

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
  const weeklyGoal = goalQ.data ?? 3;
  const today = new Date();

  async function deleteSession(id: string) {
    const ok = await confirmDialog(
      t("Eliminare questo allenamento?", "Delete this workout?"),
      t("I dati verranno rimossi definitivamente.", "The data will be permanently removed."),
    );
    if (!ok) return;
    await supabase.from("sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["week-stats", user.id] });
    qc.invalidateQueries({ queryKey: ["streak", user.id] });
    toast.success(t("Allenamento eliminato", "Workout deleted"));
  }

  const workoutDates = ((streakQ.data ?? []) as Array<{ completed_at: string | null }>)
    .filter((s) => s.completed_at !== null)
    .map((s) => new Date(s.completed_at!));

  return (
    <div className="container-app pt-safe-lg">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {format(new Date(), "EEEE d MMMM", { locale: dateLocale })}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getSessionGreeting(t, name.split(" ")[0])}
          </h1>
        </div>
        <div className="flex items-center gap-2 pt-1 shrink-0">
          <PWAInstallButton />
          <NotificationsSheet
            userId={user.id}
            open={notificationsOpen}
            onOpenChange={setNotificationsOpen}
          />
          <ProfileMenu onOpenNotifications={() => setNotificationsOpen(true)} userId={user.id} />
        </div>
      </header>

      {/* Banner messaggi diretti non letti dall'Admin */}
      <UnreadDirectMessageBanner
        userId={user.id}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      {/* Hero Weekly Card */}
      <section className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">
            {t("Questa settimana", "This week")}
          </p>
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur-md tabular-nums">
            {stats?.workouts ?? 0} / {weeklyGoal} {t("target", "goal")}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <div className="text-6xl font-black tracking-tighter tabular-nums leading-none">
              {stats?.workouts ?? 0}
            </div>
            <div className="text-xs font-semibold text-white/80">
              {(stats?.workouts ?? 0) === 1
                ? t("sessione\ncompletata", "session\ncompleted")
                : t("sessioni\ncompletate", "sessions\ncompleted")}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              {t("Volume tot.", "Total vol.")}
            </div>
            <div className="text-lg font-extrabold tracking-tight tabular-nums">
              {fmtWeight(stats?.volume ?? 0, { digits: 0 })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2">
          {stats?.days.map((d, i) => {
            const isToday = isSameDay(d.date, today);
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-10 w-full items-center justify-center rounded-xl transition-all ${
                    d.trained
                      ? "bg-white text-primary shadow-sm"
                      : isToday
                        ? "bg-white/20 ring-1 ring-white/60"
                        : "bg-white/12"
                  }`}
                >
                  {d.trained ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isToday ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    isToday ? "text-white" : "text-white/65"
                  }`}
                >
                  {format(d.date, "EEEEE", { locale: dateLocale })}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2-Column KPI Bento Row */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatCard
          label={t("Volume 7gg", "7d Volume")}
          value={fmtWeight(stats?.volume ?? 0, { digits: 0 })}
          trend={stats?.volumeChange}
          icon={<Dumbbell className="h-4 w-4 text-primary" />}
        />
        <StatCard
          label={t("Top muscolo", "Top muscle")}
          value={t(
            stats?.topMuscle ?? "—",
            MUSCLE_EN[stats?.topMuscle ?? ""] ?? stats?.topMuscle ?? "—",
          )}
          subtitle={
            stats?.topMuscleSets
              ? `${stats.topMuscleSets} ${t("serie allenate", "sets trained")}`
              : t("Nessuna serie", "No sets yet")
          }
          dotColor={stats?.topMuscle && stats.topMuscle !== "—" ? muscleColor(stats.topMuscle) : undefined}
          icon={<Flame className="h-4 w-4 text-orange-500" />}
        />
      </section>

      {/* TASK 3 — Streak card */}
      <StreakCard
        sessions={
          (streakQ.data ?? []) as Array<{
            completed_at: string | null;
            total_volume: number;
          }>
        }
        weeklyGoal={weeklyGoal}
        weeklyCount={stats?.workouts ?? 0}
        onChangeGoal={(n) => setGoal.mutate(n)}
      />

      {/* Side-by-Side Analytics Bento Cards (Heatmap & Muscoli) */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link
          to="/app/heatmap"
          className="no-tap-highlight bento-card group flex flex-col justify-between rounded-3xl p-4 transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/12 text-orange-500">
              <BarChart3 className="h-4 w-4" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* Mini Heatmap Preview Grid */}
          <div className="my-3 grid grid-cols-7 gap-1" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, idx) => {
              const d = subDays(today, 13 - idx);
              const active = workoutDates.some((wd) => isSameDay(wd, d));
              return (
                <div
                  key={idx}
                  className={`h-2.5 rounded-[3px] ${
                    active ? "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]" : "bg-muted"
                  }`}
                />
              );
            })}
          </div>

          <div>
            <div className="text-sm font-extrabold">{t("Heatmap", "Heatmap")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("3 anni di costanza", "3 years of consistency")}
            </div>
          </div>
        </Link>

        <Link
          to="/app/muscoli"
          className="no-tap-highlight bento-card group flex flex-col justify-between rounded-3xl p-4 transition active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/12 text-rose-500">
              <Activity className="h-4 w-4" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>

          {/* Mini Muscle Stimulus Bars */}
          <div className="my-3 space-y-1.5" aria-hidden="true">
            {(stats?.topMusclesList && stats.topMusclesList.length > 0
              ? stats.topMusclesList.slice(0, 2)
              : [
                  ["Petto", 4],
                  ["Schiena", 3],
                ]
            ).map(([m, count], idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: muscleColor(String(m)) }}
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(35, Number(count) * 18))}%`,
                      backgroundColor: muscleColor(String(m)),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-sm font-extrabold">{t("Muscoli", "Muscles")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("Mappa anatomica", "Anatomical map")}
            </div>
          </div>
        </Link>
      </section>

      {/* Personal Records quick link */}
      <PersonalRecordsCard userId={user.id} />

      {/* Workout calendar */}
      <div className="mt-3">
        <WorkoutCalendar workoutDays={workoutDates} />
      </div>

      {/* Quick start */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold">{t("Inizia un allenamento", "Start a workout")}</h2>
          <Link to="/app/schede" className="text-xs font-bold text-primary hover:underline">
            {t("Tutte le schede", "All plans")} →
          </Link>
        </div>
        {plansQ.data && plansQ.data.length === 0 ? (
          <Link
            to="/app/schede"
            className="bento-card flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border p-7 text-center transition active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Plus className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold">
              {t("Crea la tua prima scheda", "Create your first plan")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Oppure importala da una foto con l'AI", "Or scan a photo with AI")}
            </p>
          </Link>
        ) : (
          <div className="space-y-2.5">
            {plansQ.data?.map((p) => {
              const count = (p.exercises as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <Link
                  key={p.id}
                  to="/app/allena/$planId"
                  params={{ planId: p.id }}
                  className="no-tap-highlight bento-card group flex items-center justify-between rounded-2xl px-4 py-3.5 transition active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {count}{" "}
                        {count === 1 ? t("esercizio", "exercise") : t("esercizi", "exercises")}
                      </div>
                    </div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {stats && stats.recent.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-extrabold">{t("Sessioni recenti", "Recent sessions")}</h2>
            <Link to="/app/storico" className="text-xs font-bold text-muted-foreground hover:text-foreground">
              {t("Storico", "History")} →
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recent.map((s) => (
              <div
                key={s.id}
                className="bento-card flex items-center justify-between rounded-2xl px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">
                    {s.plan_name ?? t("Allenamento", "Workout")}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {format(new Date(s.started_at), "EEE d MMM", { locale: dateLocale })}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
                    {fmtWeight(Number(s.total_volume), { digits: 0 })}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={t("Azioni", "Actions")}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate({
                            to: s.plan_id ? "/app/schede/$planId" : "/",
                            params: s.plan_id ? { planId: s.plan_id } : {},
                          })
                        }
                      >
                        <Pencil className="mr-2 h-4 w-4" /> {t("Modifica scheda", "Edit plan")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteSession(s.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> {t("Elimina", "Delete")}
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
  subtitle,
  dotColor,
}: {
  label: string;
  value: string;
  trend?: number;
  icon?: React.ReactNode;
  subtitle?: string;
  dotColor?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="bento-card flex flex-col justify-between rounded-3xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {dotColor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <div className="text-xl sm:text-2xl font-black tracking-tight truncate tabular-nums">
          {value}
        </div>
      </div>
      {subtitle && <div className="mt-1 text-[11px] font-medium text-muted-foreground">{subtitle}</div>}
      {trend !== undefined && (
        <div
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold tabular-nums ${
            trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          }`}
        >
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend >= 0 ? "+" : ""}
          {trend.toFixed(0)}% {t("vs sett. scorsa", "vs last wk")}
        </div>
      )}
    </div>
  );
}

function PersonalRecordsCard({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const { display: fmtWeight } = useWeightUnit();
  const prsQ = usePersonalRecords(userId);

  if (!prsQ.data || prsQ.data.length === 0) return null;

  const top3 = prsQ.data.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <Link
      to="/app/pr"
      className="no-tap-highlight bento-card mt-3 block rounded-3xl p-5 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-extrabold">{t("Record Personali", "Personal Records")}</span>
            <p className="text-[10px] text-muted-foreground">
              {t("I tuoi carichi massimi", "Your heaviest lifts")}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        {top3.map((pr, idx) => (
          <div
            key={pr.exercise}
            className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs" aria-hidden="true">
                {medals[idx] ?? "🏅"}
              </span>
              <span className="text-xs font-semibold text-foreground truncate">{pr.exercise}</span>
            </div>
            <span className="rounded-md bg-primary/12 px-2 py-0.5 text-xs font-extrabold text-primary tabular-nums">
              {fmtWeight(pr.maxWeight, { digits: 1 })}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}
