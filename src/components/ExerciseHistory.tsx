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
      <div className="bento-card mt-6 overflow-hidden rounded-3xl border-primary/25 bg-primary/5">
        <div className="flex items-center gap-2 px-5 pt-4 text-xs font-extrabold uppercase tracking-widest text-primary">
          <History className="h-4 w-4" />
          {t("Le volte scorse", "Last times")}
        </div>
        <div className="space-y-2 px-5 py-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-full" />
        </div>
      </div>
    );
  }

  const entries = historyQ.data ?? [];
  if (entries.length === 0) {
    return (
      <div className="bento-card mt-6 overflow-hidden rounded-3xl border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 px-5 pt-4 text-xs font-extrabold uppercase tracking-widest text-primary">
          <History className="h-4 w-4" />
          {t("Le volte scorse", "Last times")}
        </div>
        <p className="px-5 py-3.5 text-xs text-muted-foreground">
          {t("Prima volta che registri questo esercizio.", "First time logging this exercise.")}
        </p>
      </div>
    );
  }

  const [last, ...older] = entries;

  return (
    <div className="bento-card mt-6 overflow-hidden rounded-3xl border-primary/25 bg-primary/5">
      <div className="flex items-center gap-2 px-5 pt-4 text-xs font-extrabold uppercase tracking-widest text-primary">
        <History className="h-4 w-4" />
        {t("Le volte scorse", "Last times")}
      </div>

      <div className="px-5 py-3.5">
        <HistoryEntry entry={last} fmtWeight={fmtWeight} highlight />
      </div>

      {older.length > 0 && (
        <>
          {showMore && (
            <div className="space-y-3 border-t border-primary/15 px-5 py-3.5">
              {older.map((e) => (
                <HistoryEntry key={e.sessionId} entry={e} fmtWeight={fmtWeight} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-center gap-1 border-t border-primary/15 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/5"
            aria-expanded={showMore}
          >
            {showMore
              ? t("Nascondi", "Hide")
              : t(`Vedi altre ${older.length} volte`, `See ${older.length} more times`)}
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
          className={`text-xs font-bold capitalize ${
            highlight ? "text-foreground" : "text-foreground/80"
          }`}
        >
          {when}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">{fullDate}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entry.sets.map((s, i) => (
          <span
            key={i}
            className="rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs font-bold tabular-nums shadow-2xs"
          >
            <span className="mr-1 text-[10px] text-muted-foreground">#{i + 1}</span>
            {s.reps} × {fmtWeight(s.weight, { digits: 1 })}
          </span>
        ))}
      </div>
    </div>
  );
}
