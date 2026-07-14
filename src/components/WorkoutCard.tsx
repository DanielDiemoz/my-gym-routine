import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { useWeightUnit } from "@/hooks/useWeightUnit";

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

  const when = formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: it,
  });

  const fullDate = format(new Date(date), "EEEE d MMM, HH:mm", { locale: it });

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
            {grouped.length} {grouped.length === 1 ? "esercizio" : "esercizi"}
            {Number(session.total_volume) > 0 && (
              <> · {display(Number(session.total_volume), { digits: 0 })}</>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t border-border bg-background/50 px-4 py-3">
          {grouped.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              Nessun dettaglio disponibile.
            </p>
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
                        {s.reps} × {display(s.weight, { digits: 1 })}
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
