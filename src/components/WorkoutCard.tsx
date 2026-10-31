import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, Clock, Dumbbell, Layers } from "lucide-react";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useLanguage } from "@/lib/i18n";

export type WorkoutLog = {
  exercise_name: string;
  set_number: number;
  reps: number;
  weight: number;
};

export type WorkoutSession = {
  id: string;
  plan_name: string | null;
  total_volume: number;
  started_at?: string;
  completed_at?: string | null;
};

export function WorkoutCard({
  session,
  logs,
  date,
  isOpen,
  onToggle,
}: {
  session: WorkoutSession;
  logs: WorkoutLog[];
  date: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { display } = useWeightUnit();
  const { t, dateLocale } = useLanguage();

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

  const durationMins = useMemo(() => {
    if (!session.started_at || !session.completed_at) return null;
    const diff = new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
    const mins = Math.round(diff / 60_000);
    return mins > 0 && mins < 360 ? mins : null;
  }, [session.started_at, session.completed_at]);

  const when = formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: dateLocale,
  });

  const fullDate = format(new Date(date), "EEEE d MMM yyyy, HH:mm", { locale: dateLocale });

  return (
    <div className="bento-card overflow-hidden rounded-3xl transition-colors">
      <button
        onClick={onToggle}
        className="no-tap-highlight flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition active:scale-[0.99]"
        aria-expanded={isOpen}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <Dumbbell className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-extrabold">
              {session.plan_name ?? t("Allenamento", "Workout")}
            </div>
            <div className="shrink-0 text-[11px] font-medium text-muted-foreground capitalize">
              {when}
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Layers className="h-3 w-3" />
              {grouped.length}{" "}
              {grouped.length === 1 ? t("es.", "ex.") : t("esercizi", "exercises")} · {logs.length}{" "}
              {t("serie", "sets")}
            </span>
            {durationMins !== null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {durationMins}m
              </span>
            )}
            {Number(session.total_volume) > 0 && (
              <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[11px] font-extrabold text-primary tabular-nums">
                {display(Number(session.total_volume), { digits: 0 })}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border/60 bg-muted/25 px-4 py-3.5">
          {grouped.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              {t("Nessun dettaglio disponibile.", "No details available.")}
            </p>
          ) : (
            grouped.map((g) => (
              <div key={g.name} className="rounded-2xl border border-border/60 bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold text-foreground">{g.name}</div>
                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                    {g.sets.length} {t("serie", "sets")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.sets.map((s, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 text-xs tabular-nums"
                    >
                      <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="font-bold text-foreground">
                        {s.reps} × {display(s.weight, { digits: 1 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="text-right text-[10px] font-medium capitalize text-muted-foreground">
            {fullDate}
          </div>
        </div>
      )}
    </div>
  );
}
