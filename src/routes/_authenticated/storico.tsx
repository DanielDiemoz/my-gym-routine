import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  subWeeks,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import type { WeeklyVolumeBar } from "@/components/VolumeChart";
import type { SessionsByDay } from "@/components/YearHeatMap";
import { StoricoSkeleton } from "@/components/skeletons/StoricoSkeleton";
import {
  estimateCalories,
  formatCalories,
  getWeightOrDefault,
} from "@/lib/calories";

// Lazy-load dei componenti chart per split del bundle iniziale.
// recharts + react-day-picker (con foglio di stile) sono pesanti e non servono
// per il primo paint della pagina.
const VolumeChart = lazy(() =>
  import("@/components/VolumeChart").then((m) => ({ default: m.VolumeChart })),
);
const YearHeatMap = lazy(() =>
  import("@/components/YearHeatMap").then((m) => ({ default: m.YearHeatMap })),
);

export const Route = createFileRoute("/_authenticated/storico")({
  component: Storico,
});

type Session = {
  id: string;
  plan_name: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume: number;
};

// ── Local Error Boundary ────────────────────────────────────────────────────
// Cattura errori di render dei chart (recharts / DayPicker) senza far crashare
// l'intera pagina Storico.
class ChartErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error("[ChartErrorBoundary]", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
            <p className="text-sm text-muted-foreground">
              Grafico non disponibile.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

function Storico() {
  const { user } = Route.useRouteContext();
  const [monthOffset, setMonthOffset] = useState(0);
  const month = subMonths(new Date(), monthOffset);
  const from = startOfMonth(month);
  const to = endOfMonth(month);

  // Lista sessioni del mese corrente (lista con scroll laterale).
  const q = useQuery({
    queryKey: ["history", user.id, from.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, plan_name, started_at, completed_at, total_volume")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("started_at", from.toISOString())
        .lte("started_at", to.toISOString())
        .order("started_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  // Peso utente per stima calorie
  const weightQ = useQuery({
    queryKey: ["profile-weight", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("weight_kg")
        .eq("id", user.id)
        .maybeSingle();
      return getWeightOrDefault(data?.weight_kg);
    },
    staleTime: 1000 * 60 * 5,
  });

  // TASK 1 + TASK 2 — sessioni degli ultimi 365 giorni.
  const yearQ = useQuery({
    queryKey: ["year-sessions", user.id],
    queryFn: async () => {
      const since = subDays(new Date(), 365);
      const { data, error } = await supabase
        .from("sessions")
        .select("id, started_at, completed_at, total_volume")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pick<Session, "id" | "started_at" | "completed_at" | "total_volume">[];
    },
  });

  function calcCalories(s: { started_at: string; completed_at: string | null }, weight: number) {
    if (!s.completed_at) return 0;
    const durMs = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
    if (durMs <= 0) return 0;
    return estimateCalories(weight, Math.round(durMs / 60000));
  }

  const { display, unit, isLoading: unitLoading } = useWeightUnit();
  const userWeight = weightQ.data ?? 70;

  const chartData: WeeklyVolumeBar[] = useMemo(() => {
    if (!yearQ.data) return [];
    const sessions = yearQ.data.filter(
      (s): s is { id: string; started_at: string; completed_at: string; total_volume: number } =>
        !!s.completed_at,
    );
    const today = new Date();
    const buckets: WeeklyVolumeBar[] = [];
    for (let i = 12; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekSessions = sessions.filter((s) => {
        const d = new Date(s.completed_at);
        return d >= ws && d <= we;
      });
      const volume = weekSessions.reduce((sum, s) => sum + Number(s.total_volume || 0), 0);
      const calories = weekSessions.reduce((sum, s) => sum + calcCalories(s, userWeight), 0);
      buckets.push({
        week: format(ws, "d MMM", { locale: it }),
        range: `${format(ws, "d MMM", { locale: it })} – ${format(we, "d MMM", { locale: it })}`,
        volume,
        calories,
      });
    }
    return buckets;
  }, [yearQ.data, userWeight]);

  // Aggrega per giorno per la heat-map (yyyy-MM-dd -> calorie totali).
  const sessionsByDay: SessionsByDay = useMemo(() => {
    const map = new Map<string, number>();
    if (!yearQ.data) return map;
    for (const s of yearQ.data) {
      if (!s.completed_at) continue;
      const key = format(new Date(s.completed_at), "yyyy-MM-dd");
      const existing = map.get(key) ?? 0;
      const durMs = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
      const cals = durMs > 0 ? estimateCalories(userWeight, Math.round(durMs / 60000)) : 0;
      map.set(key, existing + cals);
    }
    return map;
  }, [yearQ.data, userWeight]);

  // TASK 4 — skeleton gate su TUTTE le query principali.
  if (q.isLoading || yearQ.isLoading || weightQ.isLoading) {
    return <StoricoSkeleton />;
  }

  // Se entrambe le query hanno fallito, mostra un messaggio di errore locale
  // invece di crashare l'intera app.
  if (q.isError && yearQ.isError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Impossibile caricare lo storico. Controlla la connessione e riprova.
        </p>
        <button
          onClick={() => { q.refetch(); yearQ.refetch(); }}
          className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Riprova
        </button>
      </div>
    );
  }

  const totalVolume = (q.data ?? []).reduce((s, x) => s + Number(x.total_volume), 0);

  return (
    <div className="container-app pt-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Cronologia
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Storico</h1>
      </header>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-full p-2 text-muted-foreground"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold capitalize">
            <Calendar className="h-4 w-4" />
            {format(month, "MMMM yyyy", { locale: it })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {q.data?.length ?? 0} allenamenti ·{" "}
            {formatCalories(
              (q.data ?? []).reduce((s, x) => {
                const durMs = new Date(x.completed_at ?? x.started_at).getTime() - new Date(x.started_at).getTime();
                return s + (durMs > 0 ? estimateCalories(userWeight, Math.round(durMs / 60000)) : 0);
              }, 0),
            )}
          </div>
        </div>
        <button
          onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
          disabled={monthOffset === 0}
          className="rounded-full p-2 text-muted-foreground disabled:opacity-30"
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* TASK 1 — grafico calorie settimanali (ultimi 3 mesi). */}
      <section className="mb-6 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Calorie per settimana</h2>
        <ChartErrorBoundary>
          <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
            <VolumeChart data={chartData} />
          </Suspense>
        </ChartErrorBoundary>
      </section>

      {/* TASK 2 — heat-map annuale. */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold">Il tuo anno</h2>
        <ChartErrorBoundary
          fallback={
            <div className="flex h-32 items-center justify-center rounded-2xl border border-border bg-card">
              <p className="text-sm text-muted-foreground">Calendario non disponibile.</p>
            </div>
          }
        >
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
            <YearHeatMap sessionsByDay={sessionsByDay} unit="kcal" />
          </Suspense>
        </ChartErrorBoundary>
      </section>

      <section className="space-y-2">
        {q.data?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
          >
            <div>
              <div className="text-sm font-semibold">
                {s.plan_name ?? "Allenamento"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                {format(new Date(s.started_at), "EEEE d MMM, HH:mm", { locale: it })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black">
                {formatCalories(calcCalories(s, userWeight))}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {display(Number(s.total_volume), { digits: 0 })}
              </div>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nessun allenamento in questo mese.
          </p>
        )}
      </section>
    </div>
  );
}

