import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberWorkouts({
  circleId,
  userId,
}: {
  circleId: string;
  userId: string;
}) {
  const { display: fmtWeight } = useWeightUnit();
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
        .select("id, plan_name, completed_at, total_volume")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false });

      const sessionIds = (sessions ?? []).map((s) => s.id);
      let logs: {
        session_id: string;
        exercise_name: string;
        set_number: number;
        reps: number;
        weight: number;
      }[] = [];
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
    return q.data.sessions.map((s) => ({
      session: s,
      logs: q.data!.logs.filter((l) => l.session_id === s.id),
    }));
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
                fmtWeight={fmtWeight}
                isOpen={openId === item.session.id}
                onToggle={() =>
                  setOpenId((prev) =>
                    prev === item.session.id ? null : item.session.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkoutCard({
  session,
  logs,
  fmtWeight,
  isOpen,
  onToggle,
}: {
  session: { id: string; plan_name: string | null; completed_at: string; total_volume: number };
  logs: { exercise_name: string; set_number: number; reps: number; weight: number }[];
  fmtWeight: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sets: { setNumber: number; reps: number; weight: number }[] }
    >();
    for (const l of logs) {
      const entry = map.get(l.exercise_name) ?? { name: l.exercise_name, sets: [] };
      entry.sets.push({ setNumber: l.set_number, reps: l.reps, weight: Number(l.weight) });
      map.set(l.exercise_name, entry);
    }
    for (const e of map.values()) {
      e.sets.sort((a, b) => a.setNumber - b.setNumber);
    }
    return [...map.values()];
  }, [logs]);

  const when = formatDistanceToNow(new Date(session.completed_at), {
    addSuffix: true,
    locale: it,
  });

  const fullDate = format(new Date(session.completed_at), "EEEE d MMM, HH:mm", { locale: it });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={onToggle}
        className="no-tap-highlight flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[0.99]"
        aria-expanded={isOpen}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">
              {session.plan_name ?? "Allenamento"}
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{when}</div>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {fmtWeight(Number(session.total_volume), { digits: 0 })} ·{" "}
            {grouped.length} {grouped.length === 1 ? "esercizio" : "esercizi"}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border bg-background/50 px-4 py-3">
          {grouped.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Nessun dettaglio disponibile.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.name}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.name}
                </div>
                <div className="mt-1 space-y-1">
                  {g.sets.map((s, i) => (
                    <div
                      key={i}
                      className="flex justify-between rounded-lg bg-card px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold">Set {i + 1}</span>
                      <span>
                        {s.reps} × {fmtWeight(s.weight, { digits: 1 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="text-[10px] text-muted-foreground">{fullDate}</div>
        </div>
      )}
    </div>
  );
}
