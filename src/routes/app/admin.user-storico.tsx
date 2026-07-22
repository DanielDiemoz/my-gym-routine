import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, ArrowLeft, ShieldCheck } from "lucide-react";
import { WorkoutCard, type WorkoutLog } from "@/components/WorkoutCard";
import { StoricoSkeleton } from "@/components/skeletons/StoricoSkeleton";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/admin/user-storico")({
  ssr: false,
  component: UserStoricoPage,
});

const ADMIN_SECRET = "GYMBRO_ADMIN_2024";

type Session = {
  id: string;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
};

function UserStoricoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as Record<string, string | undefined>;
  const userId = search?.userId?.trim();
  const secret = search?.secret;

  useEffect(() => {
    if (secret !== ADMIN_SECRET) {
      console.warn("[admin] secret non valida → redirect /");
      navigate({ to: "/app" });
    }
  }, [secret, navigate]);

  if (secret !== ADMIN_SECRET || !userId) {
    return null;
  }

  return <UserStorico userId={userId} />;
}

function UserStorico({ userId }: { userId: string }) {
  const { t, dateLocale } = useLanguage();
  const [monthOffset, setMonthOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const month = subMonths(new Date(), monthOffset);
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  const profileQ = useQuery({
    queryKey: ["admin-profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      return data;
    },
  });

  const q = useQuery({
    queryKey: ["admin-history", userId, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, plan_name, started_at, completed_at, total_volume")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("started_at", from.toISOString())
        .lte("started_at", to.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  const sessionIds = (q.data ?? []).map((s) => s.id);

  const logsQ = useQuery({
    queryKey: ["admin-history-logs", userId, from.toISOString()],
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

  if (q.isLoading) {
    return <StoricoSkeleton />;
  }

  const totalVolume = (q.data ?? []).reduce((s, x) => s + Number(x.total_volume), 0);

  return (
    <div className="container-app pt-10">
      <a
        href="/app"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </a>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin · Storico utente
          </p>
          <h1 className="text-2xl font-black tracking-tight">
            {profileQ.data?.display_name ?? "Utente"}
          </h1>
          <code className="text-[10px] text-muted-foreground">{userId}</code>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-full p-2 text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold capitalize">
            <Calendar className="h-4 w-4" />
            {format(month, "MMMM yyyy", { locale: dateLocale })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {q.data?.length ?? 0}{" "}
            {q.data?.length === 1 ? t("allenamento", "workout") : t("allenamenti", "workouts")}
            {totalVolume > 0 && <> · {totalVolume.toLocaleString("it-IT")} Kg</>}
          </div>
        </div>
        <button
          onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
          disabled={monthOffset === 0}
          className="rounded-full p-2 text-muted-foreground disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <section className="space-y-2">
        {sessionsWithLogs.map((item) => (
          <WorkoutCard
            key={item.session.id}
            session={item.session}
            logs={item.logs}
            date={item.session.completed_at ?? item.session.started_at}
            isOpen={openId === item.session.id}
            onToggle={() =>
              setOpenId((prev) => (prev === item.session.id ? null : item.session.id))
            }
          />
        ))}
        {sessionsWithLogs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("Nessun allenamento in questo mese.", "No workouts this month.")}
          </p>
        )}
      </section>
    </div>
  );
}
