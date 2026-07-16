import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, ChevronRight, Dumbbell, Play } from "lucide-react";
import { SchedeSkeleton } from "@/components/skeletons/SchedeSkeleton";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/schede/")({
  component: Schede,
});

function Schede() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const activeQ = useQuery({
    queryKey: ["active-session", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, plan_id, plan_name")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 0,
  });

  const plansQ = useQuery({
    queryKey: ["plans-all", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, exercises(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
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
    navigate({ to: "/app/schede/$planId", params: { planId: data.id } });
  }

  // TASK 4 — skeleton gate.
  if (plansQ.isLoading) {
    return <SchedeSkeleton />;
  }

  return (
    <div className="container-app pt-10">
      {!!activeQ.data?.plan_id && (
        <Link
          to="/app/allena/$planId"
          params={{ planId: activeQ.data.plan_id }}
          className="no-tap-highlight mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">{activeQ.data.plan_name}</div>
            <div className="text-xs text-muted-foreground">{t("Allenamento in corso", "Workout in progress")}</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Play className="h-4 w-4 fill-current text-primary-foreground" />
          </div>
        </Link>
      )}

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("Le tue", "Your")}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{t("Schede", "Plans")}</h1>
      </header>

      {creating ? (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlan()}
            placeholder={t("Inserisci il nome della scheda…", "Enter the plan name…")}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-foreground"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setCreating(false); setName(""); }} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">{t("Annulla", "Cancel")}</button>
            <button onClick={createPlan} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground">{t("Crea", "Create")}</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> {t("Nuova scheda", "New plan")}
        </button>
      )}

      <div className="space-y-2">
        {plansQ.data?.map((p) => {
          const count = (p.exercises as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Link
              key={p.id}
              to="/app/schede/$planId"
              params={{ planId: p.id }}
              className="no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Dumbbell className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{count} {count === 1 ? t("esercizio", "exercise") : t("esercizi", "exercises")}</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          );
        })}
        {plansQ.data?.length === 0 && !creating && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("Nessuna scheda. Creane una per iniziare.", "No plans. Create one to get started.")}</p>
        )}
      </div>
    </div>
  );
}
