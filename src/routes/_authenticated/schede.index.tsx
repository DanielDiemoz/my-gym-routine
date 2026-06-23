import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronRight, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/schede")({
  component: Schede,
});

function Schede() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const plansQ = useQuery({
    queryKey: ["plans-all", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, exercises(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createPlan() {
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("plans")
      .insert({ user_id: user.id, name: name.trim() })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    setName(""); setCreating(false);
    qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
    qc.invalidateQueries({ queryKey: ["plans", user.id] });
    navigate({ to: "/schede/$planId", params: { planId: data.id } });
  }

  return (
    <div className="container-app pt-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Le tue</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Schede</h1>
      </header>

      {creating ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlan()}
            placeholder="Es. Push A, Full Body..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-foreground"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setCreating(false); setName(""); }} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Annulla</button>
            <button onClick={createPlan} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">Crea</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Nuova scheda
        </button>
      )}

      <div className="space-y-2">
        {plansQ.data?.map((p) => {
          const count = (p.exercises as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link
              key={p.id}
              to="/schede/$planId"
              params={{ planId: p.id }}
              className="no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{count} {count === 1 ? "esercizio" : "esercizi"}</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          );
        })}
        {plansQ.data?.length === 0 && !creating && (
          <p className="py-12 text-center text-sm text-muted-foreground">Nessuna scheda. Creane una per iniziare.</p>
        )}
      </div>
    </div>
  );
}
