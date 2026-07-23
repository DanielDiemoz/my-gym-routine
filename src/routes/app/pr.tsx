import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronDown, Trophy, TrendingUp, Search } from "lucide-react";
import { format } from "date-fns";
import { usePersonalRecords, type ExercisePR } from "@/hooks/usePersonalRecords";
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
      <div className="container-app pt-6">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  const prs = prsQ.data ?? [];
  const filtered = search
    ? prs.filter((p) => p.exercise.toLowerCase().includes(search.toLowerCase()))
    : prs;

  return (
    <div className="container-app pt-6">
      <div className="mb-6">
        <Link
          to="/app"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> {t("Dashboard", "Dashboard")}
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h1 className="text-3xl font-black tracking-tight">{t("Record Personali", "Personal Records")}</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {prs.length} {t("esercizi", "exercises")} · {t("1RM stimato con formula di Epley", "Estimated 1RM with Epley formula")}
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Cerca esercizio…", "Search exercise…")}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm outline-none focus:border-foreground"
        />
      </div>

      {/* PR List */}
      <div className="space-y-3">
        {filtered.map((pr) => {
          const isExpanded = expandedExercise === pr.exercise;
          return (
            <div key={pr.exercise} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedExercise(isExpanded ? null : pr.exercise)}
                className="no-tap-highlight flex w-full items-center gap-4 px-5 py-4 text-left active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{pr.exercise}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t("1RM stimato:", "Est. 1RM:")} {fmtWeight(pr.estimated1RM, { digits: 1 })}
                    <span className="mx-1.5">·</span>
                    {pr.totalSets} {t("serie", "sets")}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-primary">{fmtWeight(pr.maxWeight, { digits: 1 })}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(pr.date), "d MMM", { locale: dateLocale })}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-border bg-background/50 px-5 py-4">
                  {/* 1RM Card */}
                  <div className="mb-4 rounded-xl bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">{t("1RM Stimato", "Est. 1RM")}</span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-1 text-2xl font-black text-primary">{fmtWeight(pr.estimated1RM, { digits: 1 })}</div>
                  </div>

                  {/* History */}
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {t("Progressione", "Progression")}
                  </div>
                  <div className="space-y-1.5">
                    {pr.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-card px-3 py-2">
                        <div className="text-sm font-semibold">{fmtWeight(h.weight, { digits: 1 })}</div>
                        <div className="text-xs text-muted-foreground">
                          {h.reps} {t("rep", "reps")} · {format(new Date(h.date), "d MMM yyyy", { locale: dateLocale })}
                        </div>
                        {i === 0 && (
                          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-600">
                            {t("PR", "PR")}
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
              : t("Completa alcuni allenamenti per vedere i tuoi record!", "Complete some workouts to see your records!")}
          </p>
        )}
      </div>
    </div>
  );
}
