import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Plus, Dumbbell, Play, Sparkles, Clock, Pencil } from "lucide-react";
import { SchedeSkeleton } from "@/components/skeletons/SchedeSkeleton";
import { ScanPreviewDialog } from "@/components/ScanPreviewDialog";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/schede/")({
  component: Schede,
});

type PlanExerciseSummary = {
  muscle_group: string | null;
  sets: number;
};

type PlanRow = {
  id: string;
  name: string;
  exercises: PlanExerciseSummary[] | null;
};

function Schede() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t, dateLocale } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scanning, setScanning] = useState(false);

  const plansQ = useQuery({
    queryKey: ["plans-all", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("id, name, exercises(muscle_group, sets)")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlanRow[];
    },
  });

  const lastDoneQ = useQuery({
    queryKey: ["plans-last-done", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("plan_id, completed_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .not("plan_id", "is", null)
        .order("completed_at", { ascending: false })
        .limit(100);
      const map = new Map<string, string>();
      for (const s of data ?? []) {
        if (s.plan_id && s.completed_at && !map.has(s.plan_id)) {
          map.set(s.plan_id, s.completed_at);
        }
      }
      return map;
    },
  });

  async function createPlan() {
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("plans")
      .insert({ user_id: user.id, name: name.trim() })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
    qc.invalidateQueries({ queryKey: ["plans", user.id] });
    navigate({ to: "/app/schede/$planId", params: { planId: data.id } });
  }

  // TASK 4 — skeleton gate.
  if (plansQ.isLoading) {
    return <SchedeSkeleton />;
  }

  const lastDoneMap = lastDoneQ.data ?? new Map<string, string>();

  return (
    <div className="container-app pt-safe-lg">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {t("Programmi", "Programs")}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{t("Le tue Schede", "Your Plans")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsSheet userId={user.id} />
          <ProfileMenu userId={user.id} />
        </div>
      </header>

      {creating ? (
        <div className="bento-card mb-5 rounded-3xl p-5">
          <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("Nome della nuova scheda", "New plan name")}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlan()}
            placeholder={t("Es. Push Day A, Upper Body…", "E.g. Push Day A, Upper Body…")}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base font-semibold outline-none focus:border-primary"
          />
          <div className="mt-3.5 flex gap-2">
            <button
              onClick={() => {
                setCreating(false);
                setName("");
              }}
              className="flex-1 rounded-full border border-border py-3 text-sm font-bold"
            >
              {t("Annulla", "Cancel")}
            </button>
            <button
              onClick={createPlan}
              className="flex-1 rounded-full bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-xs"
            >
              {t("Crea scheda", "Create plan")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-[1fr_auto] gap-2.5">
          <button
            onClick={() => setCreating(true)}
            className="no-tap-highlight flex items-center justify-center gap-2 rounded-full bg-primary py-4 px-5 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" /> {t("Nuova scheda", "New plan")}
          </button>
          <button
            onClick={() => setScanning(true)}
            className="no-tap-highlight bento-card flex items-center justify-center gap-2 rounded-full border-primary/30 bg-primary/5 px-5 py-4 text-sm font-extrabold text-primary transition hover:bg-primary/10 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" /> {t("Scan AI", "AI Scan")}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {plansQ.data?.map((p) => {
          const exList = Array.isArray(p.exercises) ? p.exercises : [];
          const count = exList.length;
          const totalSets = exList.reduce((acc, e) => acc + (Number(e.sets) || 0), 0);
          const uniqueMuscles = [
            ...new Set(exList.map((e) => e.muscle_group?.trim()).filter((m): m is string => !!m)),
          ].slice(0, 4);
          const lastIso = lastDoneMap.get(p.id);
          const lastWhen = lastIso
            ? formatDistanceToNow(new Date(lastIso), { addSuffix: true, locale: dateLocale })
            : null;

          return (
            <div
              key={p.id}
              className="bento-card group relative flex items-center justify-between gap-3 rounded-3xl p-4 sm:p-5 transition hover:border-primary/30"
            >
              <Link
                to="/app/schede/$planId"
                params={{ planId: p.id }}
                className="no-tap-highlight flex-1 min-w-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-extrabold">{p.name}</h2>
                      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/80 tabular-nums">
                        {count}{" "}
                        {count === 1 ? t("esercizio", "exercise") : t("esercizi", "exercises")}
                      </span>
                      {totalSets > 0 && (
                        <>
                          <span>·</span>
                          <span className="tabular-nums">
                            {totalSets} {t("serie", "sets")}
                          </span>
                        </>
                      )}
                      {lastWhen && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" /> {lastWhen}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {uniqueMuscles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pl-14">
                    {uniqueMuscles.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${muscleColor(m)} / 15%`,
                          color: muscleColor(m),
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: muscleColor(m) }}
                        />
                        {t(m, MUSCLE_EN[m] ?? m)}
                      </span>
                    ))}
                  </div>
                )}
              </Link>

              <Link
                to="/app/allena/$planId"
                params={{ planId: p.id }}
                aria-label={t(`Avvia ${p.name}`, `Start ${p.name}`)}
                title={t("Inizia allenamento", "Start workout")}
                className="no-tap-highlight flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:scale-105 active:scale-95"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </Link>
            </div>
          );
        })}

        {plansQ.data?.length === 0 && !creating && (
          <div className="bento-card flex flex-col items-center justify-center rounded-3xl py-14 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Dumbbell className="h-8 w-8" />
            </div>
            <p className="mt-4 text-base font-extrabold">
              {t("Nessuna scheda ancora", "No plans yet")}
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              {t(
                "Crea la tua prima scheda manualmente o scansiona una foto con l'AI.",
                "Create your first plan manually or scan a photo with AI.",
              )}
            </p>
          </div>
        )}
      </div>

      {scanning && (
        <ScanPreviewDialog
          userId={user.id}
          onClose={() => setScanning(false)}
          onSaved={(planId) => {
            setScanning(false);
            qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
            qc.invalidateQueries({ queryKey: ["plans", user.id] });
            navigate({ to: "/app/schede/$planId", params: { planId } });
          }}
        />
      )}
    </div>
  );
}
