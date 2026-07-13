import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { StoricoSkeleton } from "@/components/skeletons/StoricoSkeleton";

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
  const { display } = useWeightUnit();

  // TASK 4 — skeleton gate su TUTTE le query principali.
  if (q.isLoading) {
    return <StoricoSkeleton />;
  }

  // Se la query ha fallito, mostra un messaggio di errore locale
  // invece di crashare l'intera app.
  if (q.isError) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Impossibile caricare lo storico. Controlla la connessione e riprova.
        </p>
        <button
          onClick={() => {
            q.refetch();
          }}
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
            {q.data?.length ?? 0} allenamenti
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

      <section className="space-y-2">
        {q.data?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4"
          >
            <div>
              <div className="text-sm font-semibold">{s.plan_name ?? "Allenamento"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                {format(new Date(s.started_at), "EEEE d MMM, HH:mm", { locale: it })}
              </div>
            </div>
            <div className="text-right">
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
