import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/storico")({
  component: Storico,
});

type Session = { id: string; plan_name: string | null; started_at: string; completed_at: string | null; total_volume: number };

function Storico() {
  const { user } = Route.useRouteContext();
  const [monthOffset, setMonthOffset] = useState(0);
  const month = subMonths(new Date(), monthOffset);
  const from = startOfMonth(month);
  const to = endOfMonth(month);

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

  const totalVolume = (q.data ?? []).reduce((s, x) => s + Number(x.total_volume), 0);

  return (
    <div className="container-app pt-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cronologia</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Storico</h1>
      </header>

      <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <button onClick={() => setMonthOffset((m) => m + 1)} className="rounded-full p-2 text-muted-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm font-bold capitalize">
            <Calendar className="h-4 w-4" />
            {format(month, "MMMM yyyy", { locale: it })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {q.data?.length ?? 0} allenamenti · {Math.round(totalVolume).toLocaleString("it-IT")} kg
          </div>
        </div>
        <button onClick={() => setMonthOffset((m) => Math.max(0, m - 1))} disabled={monthOffset === 0} className="rounded-full p-2 text-muted-foreground disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2">
        {q.data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
            <div>
              <div className="text-sm font-semibold">{s.plan_name ?? "Allenamento"}</div>
              <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                {format(new Date(s.started_at), "EEEE d MMM, HH:mm", { locale: it })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black">{Math.round(Number(s.total_volume)).toLocaleString("it-IT")}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">kg</div>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Nessun allenamento in questo mese.</p>
        )}
      </div>
    </div>
  );
}
