import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ShieldCheck,
  Dumbbell,
  Activity,
  Calendar,
  ChevronDown,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/admin/user/$userId")({
  ssr: false,
  component: AdminUserPage,
});

const ADMIN_SECRET = "GYMBRO_ADMIN_2024";

type Plan = {
  id: string;
  name: string;
  created_at: string;
};

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  weight: number;
  notes: string | null;
  position: number;
  plan_id: string;
};

type Session = {
  id: string;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
};

type SessionLog = {
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
};

function AdminUserPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as Record<string, string | undefined>;
  const { userId } = Route.useParams();
  const secret = search?.secret;
  const { t } = useLanguage();
  const [tab, setTab] = useState<"plans" | "history">("plans");
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const authorized = secret === ADMIN_SECRET;

  useEffect(() => {
    if (!authorized) {
      navigate({ to: "/app" });
    }
  }, [authorized, navigate]);

  const profileQ = useQuery({
    queryKey: ["admin-user-profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const plansQ = useQuery({
    queryKey: ["admin-user-plans", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Plan[];
    },
  });

  const exercisesQ = useQuery({
    queryKey: ["admin-user-exercises", userId],
    enabled: plansQ.data !== undefined,
    queryFn: async () => {
      const planIds = (plansQ.data ?? []).map((p) => p.id);
      if (planIds.length === 0) return [];
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .in("plan_id", planIds)
        .order("position");
      return (data ?? []) as Exercise[];
    },
  });

  const sessionsQ = useQuery({
    queryKey: ["admin-user-sessions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, plan_name, started_at, completed_at, total_volume")
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
      return (data ?? []) as Session[];
    },
  });

  const sessionIds = (sessionsQ.data ?? []).map((s) => s.id);

  const logsQ = useQuery({
    queryKey: ["admin-user-logs", userId],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("session_logs")
        .select("session_id, exercise_name, set_number, reps, weight")
        .in("session_id", sessionIds);
      return (data ?? []) as SessionLog[];
    },
  });

  const plansWithExercises = useMemo(() => {
    const exs = exercisesQ.data ?? [];
    return (plansQ.data ?? []).map((p) => ({
      ...p,
      exercises: exs.filter((e) => e.plan_id === p.id),
    }));
  }, [plansQ.data, exercisesQ.data]);

  const sessionsWithLogs = useMemo(() => {
    const logs = logsQ.data ?? [];
    return (sessionsQ.data ?? []).map((s) => ({
      ...s,
      logs: logs.filter((l) => l.session_id === s.id),
    }));
  }, [sessionsQ.data, logsQ.data]);

  if (!authorized) return null;

  const profile = profileQ.data;
  const totalSessions = sessionsQ.data?.length ?? 0;
  const totalVolume = sessionsQ.data?.reduce((s, x) => s + Number(x.total_volume), 0) ?? 0;

  return (
    <div className="container-app pt-10">
      <a
        href={`/app/admin?secret=${secret}`}
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Admin
      </a>

      {/* Profile header */}
      <div className="mb-6 flex items-center gap-3">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-bold">
            <User className="h-7 w-7" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-black tracking-tight">
              {profile?.display_name ?? "Senza nome"}
            </h1>
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          </div>
          <code className="text-[10px] text-muted-foreground">{userId}</code>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-2">
        <StatCard
          icon={<Dumbbell className="h-4 w-4" />}
          value={plansQ.data?.length ?? 0}
          label={t("Schede", "Plans")}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          value={totalSessions}
          label={t("Allenamenti", "Workouts")}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          value={`${(totalVolume / 1000).toFixed(1)}k`}
          label="Kg totali"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-full border border-border bg-muted p-1">
        <button
          onClick={() => setTab("plans")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
            tab === "plans" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          {t("Schede", "Plans")}
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
            tab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          {t("Storico", "History")}
        </button>
      </div>

      {/* Plans tab */}
      {tab === "plans" && (
        <div className="space-y-2">
          {plansQ.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))
          ) : plansWithExercises.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("Nessuna scheda.", "No plans.")}
            </p>
          ) : (
            plansWithExercises.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setOpenPlanId((prev) => (prev === p.id ? null : p.id))}
                  className="flex w-full items-center justify-between px-4 py-3"
                >
                  <div className="text-left">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.exercises.length}{" "}
                      {p.exercises.length === 1
                        ? t("esercizio", "exercise")
                        : t("esercizi", "exercises")}{" "}
                      · {format(new Date(p.created_at), "dd/MM/yy")}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                      openPlanId === p.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openPlanId === p.id && (
                  <div className="space-y-1.5 border-t border-border px-4 py-3">
                    {p.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-semibold">{ex.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {ex.sets}×{ex.reps} · {Number(ex.weight)} Kg
                            </span>
                            {ex.muscle_group && (
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${muscleColor(ex.muscle_group)}15`,
                                  color: muscleColor(ex.muscle_group),
                                }}
                              >
                                {t(ex.muscle_group, MUSCLE_EN[ex.muscle_group] ?? ex.muscle_group)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="space-y-2">
          {sessionsQ.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))
          ) : sessionsWithLogs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t("Nessun allenamento.", "No workouts.")}
            </p>
          ) : (
            sessionsWithLogs.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setOpenSessionId((prev) => (prev === s.id ? null : s.id))}
                  className="flex w-full items-center justify-between px-4 py-3"
                >
                  <div className="text-left">
                    <div className="font-semibold">
                      {s.plan_name ?? t("Allenamento", "Workout")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(s.started_at), "dd MMM yyyy · HH:mm")} ·{" "}
                      {Number(s.total_volume).toLocaleString("it-IT")} Kg
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                      openSessionId === s.id ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openSessionId === s.id && (
                  <div className="space-y-1.5 border-t border-border px-4 py-3">
                    {s.logs.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("Nessun log.", "No logs.")}
                      </p>
                    ) : (
                      (() => {
                        const map = new Map<string, { name: string; sets: typeof s.logs }>();
                        for (const l of s.logs) {
                          const entry = map.get(l.exercise_name) ?? {
                            name: l.exercise_name,
                            sets: [],
                          };
                          entry.sets.push(l);
                          map.set(l.exercise_name, entry);
                        }
                        return [...map.values()].map((ex) => (
                          <div key={ex.name} className="rounded-xl bg-muted/50 px-3 py-2">
                            <div className="text-sm font-semibold">{ex.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ex.sets
                                .sort((a, b) => a.set_number - b.set_number)
                                .map((l) => `${l.set_number}. ${l.reps}×${Number(l.weight)}Kg`)
                                .join(" · ")}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="text-lg font-black">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
