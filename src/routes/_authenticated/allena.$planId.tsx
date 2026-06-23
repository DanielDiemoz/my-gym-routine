import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Check, Timer, Plus, Minus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/allena/$planId")({
  component: ActiveSession,
});

type Exercise = {
  id: string; name: string; muscle_group: string | null;
  sets: number; reps: number; weight: number; notes: string | null;
};

type LoggedSet = { reps: number; weight: number; done: boolean };

function ActiveSession() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const planQ = useQuery({
    queryKey: ["session-plan", planId],
    queryFn: async () => {
      const { data: plan } = await supabase.from("plans").select("id, name").eq("id", planId).maybeSingle();
      const { data: ex } = await supabase
        .from("exercises").select("*").eq("plan_id", planId).order("position", { ascending: true });
      return { plan, exercises: (ex ?? []) as Exercise[] };
    },
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [logs, setLogs] = useState<Record<string, LoggedSet[]>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // create session row once
  useEffect(() => {
    if (!planQ.data?.plan || sessionId) return;
    (async () => {
      const { data } = await supabase
        .from("sessions")
        .insert({ user_id: user.id, plan_id: planId, plan_name: planQ.data!.plan!.name })
        .select("id").single();
      if (data) setSessionId(data.id);
    })();
  }, [planQ.data, sessionId, planId, user.id]);

  // init logs
  useEffect(() => {
    if (!planQ.data?.exercises) return;
    setLogs((prev) => {
      const next = { ...prev };
      planQ.data!.exercises.forEach((e) => {
        if (!next[e.id]) next[e.id] = Array.from({ length: e.sets }, () => ({ reps: e.reps, weight: Number(e.weight), done: false }));
      });
      return next;
    });
  }, [planQ.data]);

  const exercises = planQ.data?.exercises ?? [];
  const current = exercises[currentIdx];

  async function cancelSession() {
    if (!confirm("Annullare l'allenamento? I dati non saranno salvati.")) return;
    if (sessionId) await supabase.from("sessions").delete().eq("id", sessionId);
    navigate({ to: "/" });
  }

  async function finishWorkout() {
    if (!sessionId) return;
    setFinishing(true);
    const rows: { session_id: string; user_id: string; exercise_name: string; muscle_group: string | null; set_number: number; reps: number; weight: number }[] = [];
    let totalVolume = 0;
    for (const ex of exercises) {
      const sets = logs[ex.id] ?? [];
      sets.forEach((s, i) => {
        if (s.done) {
          rows.push({
            session_id: sessionId, user_id: user.id,
            exercise_name: ex.name, muscle_group: ex.muscle_group,
            set_number: i + 1, reps: s.reps, weight: s.weight,
          });
          totalVolume += s.reps * s.weight;
        }
      });
    }
    if (rows.length === 0) {
      toast.error("Nessuna serie completata");
      setFinishing(false);
      return;
    }
    await supabase.from("session_logs").insert(rows);
    await supabase.from("sessions").update({ completed_at: new Date().toISOString(), total_volume: totalVolume }).eq("id", sessionId);
    toast.success("Allenamento salvato!");
    navigate({ to: "/" });
  }

  if (!current) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        {planQ.data && exercises.length === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">Questa scheda non ha esercizi.</p>
            <button onClick={() => navigate({ to: "/schede/$planId", params: { planId } })} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Aggiungi esercizi</button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        )}
      </div>
    );
  }

  const setsLog = logs[current.id] ?? [];
  const isLast = currentIdx === exercises.length - 1;

  function updateSet(idx: number, patch: Partial<LoggedSet>) {
    setLogs((prev) => ({
      ...prev,
      [current.id]: prev[current.id].map((s, i) => i === idx ? { ...s, ...patch } : s),
    }));
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="container-app pt-6">
        <div className="mb-5 flex items-center justify-between">
          <button onClick={cancelSession} className="rounded-full p-2 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {currentIdx + 1} / {exercises.length}
          </div>
          <div className="w-9" />
        </div>

        {/* Progress */}
        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${((currentIdx + 1) / exercises.length) * 100}%` }} />
        </div>

        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{current.muscle_group ?? "Esercizio"}</div>
        <h1 className="text-3xl font-black tracking-tight">{current.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Target: {current.sets} × {current.reps} @ {Number(current.weight)}kg</p>
        {current.notes && <p className="mt-2 rounded-xl bg-muted p-3 text-sm">{current.notes}</p>}

        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <div>Set</div>
            <div className="text-center">Rip.</div>
            <div className="text-center">Kg</div>
            <div />
          </div>
          {setsLog.map((s, i) => (
            <div key={i} className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 rounded-2xl border p-2 ${s.done ? "border-foreground bg-foreground/5" : "border-border bg-card"}`}>
              <div className="text-center text-lg font-black">{i + 1}</div>
              <StepperInput value={s.reps} onChange={(v) => updateSet(i, { reps: v })} step={1} />
              <StepperInput value={s.weight} onChange={(v) => updateSet(i, { weight: v })} step={2.5} />
              <button
                onClick={() => updateSet(i, { done: !s.done })}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${s.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setLogs((p) => ({ ...p, [current.id]: [...p[current.id], { reps: current.reps, weight: Number(current.weight), done: false }] }))}
            className="w-full rounded-2xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground"
          >
            + Serie extra
          </button>
        </div>

        <RestTimer />
      </div>

      {/* Footer actions */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="container-app flex gap-2 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {currentIdx > 0 && (
            <button onClick={() => setCurrentIdx((i) => i - 1)} className="rounded-full border border-border px-5 py-3.5 text-sm font-semibold">
              Indietro
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setCurrentIdx((i) => i + 1)} className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]">
              Prossimo esercizio
            </button>
          ) : (
            <button onClick={finishWorkout} disabled={finishing} className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60">
              {finishing ? "..." : "Termina allenamento"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepperInput({ value, onChange, step }: { value: number; onChange: (n: number) => void; step: number }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        value={value}
        inputMode="decimal"
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-12 bg-transparent text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button onClick={() => onChange(+(value + step).toFixed(2))} className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(90);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (ref.current) clearInterval(ref.current);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const remaining = Math.max(0, target - seconds);
  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="mt-8 rounded-3xl bg-card border border-border p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-4 w-4" /> Recupero
        </div>
        <div className="flex gap-1">
          {[60, 90, 120, 180].map((t) => (
            <button
              key={t}
              onClick={() => { setTarget(t); setSeconds(0); }}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${target === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >{t}s</button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-5xl font-black tracking-tighter tabular-nums">{mm}:{ss}</div>
        <div className="flex gap-2">
          <button onClick={() => { setSeconds(0); setRunning(false); }} className="rounded-full border border-border px-4 py-2 text-xs font-semibold">Reset</button>
          <button onClick={() => setRunning((r) => !r)} className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
            {running ? "Pausa" : "Avvia"}
          </button>
        </div>
      </div>
    </div>
  );
}
