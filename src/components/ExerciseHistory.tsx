import { useState } from "react";
import { History, ChevronDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useExerciseHistory, type ExerciseHistoryEntry } from "@/hooks/useExerciseHistory";

export function ExerciseHistory({ exerciseName }: { exerciseName: string | undefined }) {
  const { display: fmtWeight } = useWeightUnit();
  const historyQ = useExerciseHistory(exerciseName);
  const [showMore, setShowMore] = useState(false);

  const entries = historyQ.data ?? [];
  if (historyQ.isLoading || entries.length === 0) return null;

  const [last, ...older] = entries;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-4 pt-3 text-xs font-bold uppercase tracking-widest text-primary">
        <History className="h-4 w-4" />
        Le volte scorse
      </div>

      <div className="px-4 py-3">
        <HistoryEntry entry={last} fmtWeight={fmtWeight} highlight />
      </div>

      {older.length > 0 && (
        <>
          {showMore && (
            <div className="space-y-3 border-t border-primary/20 px-4 py-3">
              {older.map((e) => (
                <HistoryEntry key={e.sessionId} entry={e} fmtWeight={fmtWeight} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-center gap-1 border-t border-primary/20 py-2.5 text-xs font-semibold text-primary"
            aria-expanded={showMore}
          >
            {showMore ? "Nascondi" : `Vedi altre ${older.length} volte`}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </button>
        </>
      )}
    </div>
  );
}

function HistoryEntry({
  entry,
  fmtWeight,
  highlight = false,
}: {
  entry: ExerciseHistoryEntry;
  fmtWeight: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  highlight?: boolean;
}) {
  const when = formatDistanceToNow(new Date(entry.date), { addSuffix: true, locale: it });
  const fullDate = format(new Date(entry.date), "d MMM yyyy", { locale: it });

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span
          className={`text-sm font-bold ${highlight ? "text-foreground" : "text-foreground/80"}`}
        >
          {when}
        </span>
        <span className="text-[10px] text-muted-foreground">{fullDate}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.sets.map((s, i) => (
          <span key={i} className="rounded-lg bg-card px-2.5 py-1 text-xs font-semibold shadow-sm">
            {s.reps} × {fmtWeight(s.weight, { digits: 1 })}
          </span>
        ))}
      </div>
    </div>
  );
}
