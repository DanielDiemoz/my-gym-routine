import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronDown, Trophy, TrendingUp, Search, X } from "lucide-react";
import { format } from "date-fns";
import { usePersonalRecords } from "@/hooks/usePersonalRecords";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/pr")({
  component: PersonalRecordsPage,
});

function PersonalRecordsPage() {
  const { user } = Route.useRouteContext();
  const { t, dateLocale } = useLanguage();
  const { display: fmtWeight } = useWeightUnit();
  const [search, setSearch] = useState("");
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const prsQ = usePersonalRecords(user.id);

  if (prsQ.isLoading) {
    return (
      <div className="container-app pt-safe">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      </div>
    );
  }

  const prs = prsQ.data ?? [];
  const filtered = search
    ? prs.filter((p) => p.exercise.toLowerCase().includes(search.toLowerCase()))
    : prs;

  return (
    <div className="container-app pt-safe">
      <div className="mb-6">
        <Link
          to="/app"
          className="-ml-2.5 inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 px-2.5 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground active:opacity-60 touch-manipulation"
        >
          <ChevronLeft className="h-5 w-5" /> {t("Dashboard", "Dashboard")}
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {t("Record Personali", "Personal Records")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {prs.length} {t("esercizi", "exercises")} ·{" "}
              {t("1RM stimato con formula di Epley", "Estimated 1RM with Epley formula")}
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Cerca esercizio…", "Search exercise…")}
          className="w-full rounded-2xl border border-border bg-card pl-10 pr-9 py-3 text-sm font-semibold outline-none transition focus:border-primary"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            aria-label={t("Pulisci ricerca", "Clear search")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* PR List */}
      <div className="space-y-3">
        {filtered.map((pr, idx) => {
          const isExpanded = expandedExercise === pr.exercise;
          return (
            <div key={pr.exercise} className="bento-card rounded-3xl overflow-hidden">
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : pr.exercise)}
                className="no-tap-highlight flex w-full items-center gap-3.5 px-5 py-4 text-left transition active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-500 font-extrabold text-sm tabular-nums">
                  {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : <Trophy className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold truncate">{pr.exercise}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {t("1RM stimato:", "Est. 1RM:")}{" "}
                    <span className="font-bold text-foreground/85">
                      {fmtWeight(pr.estimated1RM, { digits: 1 })}
                    </span>
                    <span className="mx-1.5">·</span>
                    {pr.totalSets} {t("serie", "sets")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="rounded-lg bg-primary/12 px-2.5 py-1 text-base font-black text-primary tabular-nums">
                    {fmtWeight(pr.maxWeight, { digits: 1 })}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                    {format(new Date(pr.date), "d MMM yyyy", { locale: dateLocale })}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-border/60 bg-muted/25 px-5 py-4">
                  {/* 1RM Card */}
                  <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        {t("1RM Stimato (Massimale)", "Estimated 1RM")}
                      </span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-1 text-2xl font-black text-primary tabular-nums">
                      {fmtWeight(pr.estimated1RM, { digits: 1 })}
                    </div>
                  </div>

                  {/* History */}
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">
                    {t("Progressione dei record", "Record progression")}
                  </div>
                  <div className="space-y-1.5">
                    {pr.history.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-3.5 py-2.5"
                      >
                        <div className="text-sm font-extrabold tabular-nums">
                          {fmtWeight(h.weight, { digits: 1 })}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {h.reps} {t("rep", "reps")} ·{" "}
                          {format(new Date(h.date), "d MMM yyyy", { locale: dateLocale })}
                        </div>
                        {i === 0 && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-500">
                            PR
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {search
              ? t("Nessun esercizio trovato.", "No exercises found.")
              : t(
                  "Completa alcuni allenamenti per vedere i tuoi record!",
                  "Complete some workouts to see your records!",
                )}
          </p>
        )}
      </div>
    </div>
  );
}
