import { useEffect, useState } from "react";
import { History, ChevronDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useExerciseHistory, type ExerciseHistoryEntry } from "@/hooks/useExerciseHistory";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export function ExerciseHistory({ exerciseName }: { exerciseName: string | undefined }) {
  const { display: fmtWeight } = useWeightUnit();
  const { t, dateLocale } = useLanguage();
  const historyQ = useExerciseHistory(exerciseName);
  const [showMore, setShowMore] = useState(false);

  // Reset dello stato "mostra altre" quando cambia l'esercizio (il componente
  // rimane montato e riuserebbe lo stato vecchio altrimenti).
  useEffect(() => {
    setShowMore(false);
  }, [exerciseName]);

  if (!exerciseName) return null;

  // Skeleton durante il caricamento per evitare lo sfarfallio del banner.
  if (historyQ.isLoading) {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 px-4 pt-3 text-xs font-bold uppercase tracking-widest text-primary">
          <History className="h-4 w-4" />
          {t("Le volte scorse", "Last times")}
        </div>
        <div className="space-y-2 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-full" />
        </div>
      </div>
    );
  }

  const entries = historyQ.data ?? [];
  if (entries.length === 0) {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 px-4 pt-3 text-xs font-bold uppercase tracking-widest text-primary">
          <History className="h-4 w-4" />
          {t("Le volte scorse", "Last times")}
        </div>
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {t("Prima volta che fai questo esercizio.", "First time doing this exercise.")}
        </p>
      </div>
    );
  }

  const [last, ...older] = entries;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2 px-4 pt-3 text-xs font-bold uppercase tracking-widest text-primary">
        <History className="h-4 w-4" />
        {t("Le volte scorse", "Last times")}
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
            {showMore ? t("Nascondi", "Hide") : t(`Vedi altre ${older.length} volte`, `See ${older.length} more times`)}
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
  const { dateLocale } = useLanguage();
  const when = formatDistanceToNow(new Date(entry.date), { addSuffix: true, locale: dateLocale });
  const fullDate = format(new Date(entry.date), "d MMM yyyy", { locale: dateLocale });

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
