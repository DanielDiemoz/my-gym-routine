import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Activity } from "lucide-react";
import { useState } from "react";
import { useMuscleStimulusData } from "@/hooks/useMuscleStimulusData";
import { BodyMap } from "@/components/BodyMap";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/muscoli")({
  component: MuscoliPage,
});

const TIMEFRAMES = [
  { value: "week" as const, label: "7 giorni", labelEn: "7 days" },
  { value: "month" as const, label: "Mese", labelEn: "Month" },
  { value: "3months" as const, label: "3 mesi", labelEn: "3 months" },
  { value: "6months" as const, label: "6 mesi", labelEn: "6 months" },
];

const METRICS = [
  { value: "volume" as const, label: "Volume", labelEn: "Volume" },
  { value: "sets" as const, label: "Serie", labelEn: "Sets" },
];

function MuscoliPage() {
  const { user } = Route.useRouteContext();
  const { t } = useLanguage();
  const [timeframe, setTimeframe] = useState<"week" | "month" | "3months" | "6months">("month");
  const [metric, setMetric] = useState<"volume" | "sets">("volume");

  const muscleQ = useMuscleStimulusData(user.id, timeframe, metric);

  if (muscleQ.isLoading) {
    return (
      <div className="container-app pt-4">
        <Skeleton className="mb-4 h-5 w-24" />
        <Skeleton className="mb-6 h-9 w-48" />
        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
        <Skeleton className="mb-4 h-10 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (muscleQ.isError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            "Impossibile caricare i dati muscolari. Controlla la connessione e riprova.",
            "Unable to load muscle data. Check your connection and try again.",
          )}
        </p>
        <button
          onClick={() => muscleQ.refetch()}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("Riprova", "Retry")}
        </button>
      </div>
    );
  }

  const data = muscleQ.data;
  if (!data) return null;

  const hasAnyData = data.muscles.some((m) => m.volume > 0 || m.sets > 0);

  return (
    <div className="container-app pt-4">
      <div className="mb-4">
        <Link
          to="/app"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> {t("Dashboard", "Dashboard")}
        </Link>
      </div>

      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-red-500" />
          <h1 className="text-2xl font-black tracking-tight">
            {t("I tuoi Muscoli", "Your Muscles")}
          </h1>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t("Stimolo per gruppo muscolare", "Stimulus per muscle group")}
        </p>
      </header>

      {/* Timeframe selector */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              timeframe === tf.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(tf.label, tf.labelEn)}
          </button>
        ))}
      </div>

      {/* Metric toggle */}
      <div className="mb-4 flex gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.value}
            onClick={() => setMetric(m.value)}
            className={`flex-1 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
              metric === m.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t(m.label, m.labelEn)}
          </button>
        ))}
      </div>

      {hasAnyData ? (
        <>
          <BodyMap data={data} metric={metric} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Activity className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-base font-semibold">
            {t("Nessun allenamento in questo periodo", "No workouts in this period")}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t(
              "Completa alcuni allenamenti per vedere la stimolazione muscolare.",
              "Complete some workouts to see your muscle stimulus.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
