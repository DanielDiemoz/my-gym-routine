import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutCard, type WorkoutLog } from "@/components/WorkoutCard";

export function MemberWorkouts({ circleId, userId }: { circleId: string; userId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

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

  const memberName = q.data?.profile?.display_name?.trim() || "Atleta";

  return (
    <div className="container-app pt-6">
      <div className="mb-6">
        <Link
          to="/cerchia/$circleId"
          params={{ circleId }}
          search={{ user: undefined }}
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> Cerchia
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
              {q.data?.sessions.length ?? 0} allenamenti
            </p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Allenamenti</h2>
        {sessionsWithLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nessun allenamento recente.
          </p>
        ) : (
          <div className="space-y-2">
            {sessionsWithLogs.map((item) => (
              <WorkoutCard
                key={item.session.id}
                session={item.session}
                logs={item.logs}
                date={item.session.completed_at}
                isOpen={openId === item.session.id}
                onToggle={() =>
                  setOpenId((prev) => (prev === item.session.id ? null : item.session.id))
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
