import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, BarChart3 } from "lucide-react";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { WorkoutHeatmap } from "@/components/WorkoutHeatmap";
import { useLanguage } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/heatmap")({
  component: HeatmapPage,
});

function HeatmapPage() {
  const { user } = Route.useRouteContext();
  const { t } = useLanguage();
  const heatmapQ = useHeatmapData(user.id);

  if (heatmapQ.isLoading) {
    return (
      <div className="container-app pt-6">
        <Skeleton className="mb-6 h-5 w-24" />
        <Skeleton className="mb-8 h-9 w-48" />
        <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (heatmapQ.isError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          {t(
            "Impossibile caricare la heatmap. Controlla la connessione e riprova.",
            "Unable to load heatmap. Check your connection and try again.",
          )}
        </p>
        <button
          onClick={() => heatmapQ.refetch()}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("Riprova", "Retry")}
        </button>
      </div>
    );
  }

  const data = heatmapQ.data;
  if (!data) return null;

  const hasAnyWorkout = data.years.some((y) => y.totalCount > 0);

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
          <BarChart3 className="h-6 w-6 text-orange-500" />
          <h1 className="text-3xl font-black tracking-tight">
            {t("La tua Heatmap", "Your Heatmap")}
          </h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("I tuoi ultimi 3 anni di allenamenti", "Your last 3 years of workouts")}
        </p>
      </header>

      {hasAnyWorkout ? (
        <WorkoutHeatmap years={data.years} thresholds={data.thresholds} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-base font-semibold">
            {t("Nessun allenamento ancora", "No workouts yet")}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t(
              "Completa alcuni allenamenti per vedere la tua heatmap.",
              "Complete some workouts to see your heatmap.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
