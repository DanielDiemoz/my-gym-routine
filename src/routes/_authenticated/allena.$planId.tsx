import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { X, Check, Plus, Minus, RotateCcw, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExerciseHistory } from "@/components/ExerciseHistory";
import { RestTimer } from "@/components/RestTimer";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useWorkoutStash } from "@/lib/workout-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/allena/$planId")({
  component: ActiveSession,
});

// ── Persistenza modulo (indipendente da React) ──────────────────────────
// Salviamo lo stato in un closure module-level + localStorage.
// In questo modo la persistenza NON dipende dal ciclo di vita di React
// (effetti, useCallback, ecc.) e funziona anche su chiusura tab improvvisa.
const WS_KEY = "gw_ws";
let _cached: string | null = null;

function persist(stateStr: string) {
  _cached = stateStr;
  try { localStorage.setItem(WS_KEY, stateStr); } catch {}
}

function restore(): string | null {
  if (_cached) return _cached;
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (raw) _cached = raw;
    return raw;
  } catch { return null; }
}

function clearPersisted() {
  _cached = null;
  try { localStorage.removeItem(WS_KEY); } catch {}
}

// Sempre attivo: prima di chiudere la pagina, salva l'ultimo stato.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_cached) try { localStorage.setItem(WS_KEY, _cached); } catch {}
  });
}

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  weight: number;
  notes: string | null;
};

type LoggedSet = { reps: number; weight: number; done: boolean };

type OrphanSession = { id: string; started_at: string; workout_state: Json | null };

type WorkoutState = {
  sessionId: string;
  planId?: string;
  userId?: string;
  logs: Record<string, LoggedSet[]>;
  currentIdx: number;
  localExercises: Exercise[];
};

function ActiveSession() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const { display: fmtWeight } = useWeightUnit();

  const planQ = useQuery({
    queryKey: ["session-plan", planId],
    queryFn: async () => {
      const { data: plan } = await supabase
        .from("plans")
        .select("id, name")
        .eq("id", planId)
        .maybeSingle();
      const { data: ex } = await supabase
        .from("exercises")
        .select("*")
        .eq("plan_id", planId)
        .order("position", { ascending: true });
      return { plan, exercises: (ex ?? []) as Exercise[] };
    },
  });

  // TASK 3 — Query per sessioni orfane (started_at valorizzato, completed_at NULL).
  const orphanQ = useQuery({
    queryKey: ["orphan-session", user.id, planId],
    queryFn: async (): Promise<OrphanSession | null> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, started_at, workout_state")
        .eq("plan_id", planId)
        .eq("user_id", user.id)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [logs, setLogs] = useState<Record<string, LoggedSet[]>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const sessionCreated = useRef(false);
  const [userDecision, setUserDecision] = useState<"resume" | "start-new" | null>(null);
  const [orphanIdAtDecision, setOrphanIdAtDecision] = useState<string | null>(null);
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();

  // Copia mutabile degli esercizi (per la sostituzione in sessione).
  const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workCtx, setData: setWorkCtx } = useWorkoutStash();

  const latestDraftRef = useRef<WorkoutState | null>(null);
  const persistDraft = useCallback((state: WorkoutState | null) => {
    if (!state?.sessionId) return;
    console.log("[PERSIST] saving to LS", state.sessionId, "logs:", Object.keys(state.logs ?? {}).length, "exercises");
    persist(JSON.stringify(state));
    setWorkCtx(JSON.stringify(state));
  }, [setWorkCtx]);
  const stageDraft = useCallback((state: WorkoutState | null) => {
    if (!state?.sessionId) return;
    latestDraftRef.current = state;
    console.log("[PERSIST] stageDraft saving to LS", state.sessionId, "logs:", Object.keys(state.logs ?? {}).length, "exercises");
    persist(JSON.stringify(state));
  }, []);

  // ── Persistenza su DB (workout_state JSONB) ─────────────────────────
  const dbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveWorkoutStateToDb = useCallback(async (state: WorkoutState | null) => {
    if (!state?.sessionId) return;
    const { error } = await supabase
      .from("sessions")
      .update({ workout_state: state })
      .eq("id", state.sessionId);
    if (error) console.warn("DB workout_state save failed:", error.message);
  }, []);

  // Sincronizza localExercises dal piano al caricamento.
  useEffect(() => {
    if (planQ.data?.exercises && localExercises.length === 0) {
      setLocalExercises(planQ.data.exercises);
    }
  }, [planQ.data]);

  // ── TASK 3: State-machine per la creazione della sessione ──────────────────
  // Regole:
  // - Skip se già eseguita (ref flag anti-StrictMode).
  // - Aspetta planQ espresso e orphanQ risolto.
  // - Se esiste un'orfana, l'utente DEVE scegliere (riprendi o inizia nuovo).
  // - Pattern "create-first, delete-later": se start-new, inserisco la nuova
  //   sessione PRIMA e cancello la vecchia DOPO (in caso di errore sul nuovo
  //   insert, l'orfana resta intatta per un successivo retry).
  // - Snapshot `orphanIdAtDecision` per evitare race su refetch di React Query
  //   scegliendo l'id "vecchio" piuttosto che uno aggiornato.
  useEffect(() => {
    if (sessionCreated.current) return;
    if (!planQ.data?.plan || orphanQ.isLoading || sessionId) return;
    // Se orphanQ.data è null ma un background refetch è in corso (isFetching),
    // aspettiamo che finisca prima di decidere. Su mount successivi (navigazione
    // client-side) la cache di React Query può contenere null non aggiornato.
    if (!orphanQ.data && orphanQ.isFetching) return;

    const orphan = orphanQ.data;
    if (orphan && !userDecision) {
      const last = JSON.parse(sessionStorage.getItem("gw_last") ?? "null") as WorkoutState | null;
      const ctxData = JSON.parse(workCtx ?? "null") as WorkoutState | null;
      const match = (last?.sessionId === orphan.id && last?.planId === planId) ||
                    ctxData?.sessionId === orphan.id;
      if (match) {
        setOrphanIdAtDecision(orphan.id);
        setUserDecision("resume");
        return;
      }
      return; // aspetta click utente
    }

    sessionCreated.current = true;

    let cancelled = false;

    console.log("[SESSION] resolve decision:", userDecision, "orphanId:", orphanIdAtDecision);
    (async () => {
      try {
        let resolvedId: string | null = null;

        if (userDecision === "resume" && orphanIdAtDecision) {
          // Caso A: l'utente vuole riprendere l'orfana, riusiamo l'id snapshot.
          // NOTA: NON usiamo `orphan` (orphanQ.data) perché un background refetch
          // di React Query può renderlo null tra il render e l'esecuzione async.
          // `orphanIdAtDecision` è lo snapshot stabile preso al momento della decisione.
          resolvedId = orphanIdAtDecision;
        } else if (planQ.data?.plan) {
          // Caso B/C: nessuna orfana OPPURE "Inizia nuovo". Insert SEMPRE PRIMA.
          const { data, error } = await supabase
            .from("sessions")
            .insert({
              user_id: user.id,
              plan_id: planId,
              plan_name: planQ.data.plan.name,
            })
            .select("id")
            .single();
          if (cancelled) return;
          if (error) throw error;
          resolvedId = data?.id ?? null;

          // Solo DOPO che il nuovo insert è andato bene, cancello l'orfana vecchia.
          if (userDecision === "start-new" && orphanIdAtDecision) {
            const { error: delErr } = await supabase
              .from("sessions")
              .delete()
              .eq("id", orphanIdAtDecision);
            if (delErr) {
              // Non bloccare: l'utente ha già la nuova sessione attiva.
              console.warn("Cleanup vecchia sessione fallito:", delErr.message);
            }
          }
        }

        if (!cancelled && resolvedId) {
          console.log("[SESSION] setting sessionId:", resolvedId);
          setSessionId(resolvedId);
          sessionStorage.setItem("gw_last", JSON.stringify({
            sessionId: resolvedId,
            planId,
            userId: user.id,
            logs: {},
            currentIdx: 0,
            localExercises: [],
          }));
        }
      } catch (err) {
        if (cancelled) return;
        // Rollback del lock: l'utente può ricaricare per riprovare.
        sessionCreated.current = false;
        toast.error(err instanceof Error ? err.message : "Errore di sessione");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    planQ.data,
    orphanQ.data,
    orphanQ.isLoading,
    orphanQ.isFetching,
    userDecision,
    orphanIdAtDecision,
    sessionId,
    planId,
    user.id,
    workCtx,
  ]);

  // Init logs dal piano (snapshot dei default di serie).
  useEffect(() => {
    if (!planQ.data?.exercises) return;
    setLogs((prev) => {
      const next = { ...prev };
      planQ.data!.exercises.forEach((e) => {
        if (!next[e.id]) {
          next[e.id] = Array.from({ length: e.sets }, () => ({
            reps: e.reps,
            weight: Number(e.weight),
            done: false,
          }));
        }
      });
      return next;
    });
  }, [planQ.data]);

  // ── Restore ──────────────────────────────────────────────────────────
  const restoredRef = useRef(false);
  const skipNextPersistRef = useRef(false);
  useEffect(() => {
    if (!sessionId) { console.log("[RESTORE] no sessionId yet"); return; }
    if (restoredRef.current) { console.log("[RESTORE] already restored"); return; }

    if (orphanQ.isLoading) { console.log("[RESTORE] waiting for orphanQ"); return; }
    if (!orphanQ.data && orphanQ.isFetching) { console.log("[RESTORE] waiting for orphanQ"); return; }

    restoredRef.current = true;
    skipNextPersistRef.current = true;

    console.log("[RESTORE] attempting restore for sessionId:", sessionId, "planId:", planId, "userId:", user.id);
    let saved: WorkoutState | null = null;
    try {
      const raw = restore();
      if (raw) saved = JSON.parse(raw) as WorkoutState;
    } catch {}

    console.log("[RESTORE] localStorage found:", !!saved, "sessionId:", saved?.sessionId);
    if (!saved) { console.log("[RESTORE] no valid state to restore"); return; }
    console.log("[RESTORE] sessionId match:", saved.sessionId === sessionId);
    if (saved.sessionId !== sessionId) { console.log("[RESTORE] no valid state to restore"); return; }
    console.log("[RESTORE] planId match:", saved.planId === planId);
    if (saved.planId !== planId) { console.log("[RESTORE] no valid state to restore"); return; }
    console.log("[RESTORE] userId match:", saved.userId === user.id);
    if (saved.userId !== user.id) { console.log("[RESTORE] no valid state to restore"); return; }

    console.log("[RESTORE] restoring with", Object.keys(saved?.logs ?? {}).length, "exercises");
    latestDraftRef.current = {
      sessionId, planId, userId: user.id,
      logs: saved.logs ?? {},
      currentIdx: saved.currentIdx ?? 0,
      localExercises: saved.localExercises ?? [],
    };
    _cached = JSON.stringify(latestDraftRef.current);
    setCurrentIdx(saved.currentIdx ?? 0);
    if (saved.localExercises?.length) setLocalExercises(saved.localExercises);
    if (saved.logs) {
      setLogs(() => {
        const merged = { ...saved.logs };
        for (const ex of planQ.data?.exercises ?? []) {
          if (!merged[ex.id]) {
            merged[ex.id] = Array.from({ length: ex.sets }, () => ({
              reps: ex.reps,
              weight: Number(ex.weight),
              done: false,
            }));
          }
        }
        return merged;
      });
    }
  }, [sessionId, orphanQ.data, orphanQ.isLoading, orphanQ.isFetching, planId, user.id, planQ.data?.exercises]);

  // ── Persistenza ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !restoredRef.current) return;
    latestDraftRef.current = { sessionId, planId, userId: user.id, logs, currentIdx, localExercises };
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    persistDraft(latestDraftRef.current);
  }, [sessionId, planId, user.id, logs, currentIdx, localExercises, persistDraft]);

  useEffect(() => {
    const flushDraft = () => { console.log("[FLUSH] flushing draft on close"); persistDraft(latestDraftRef.current); };
    const flushDb = () => {
      if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
      saveWorkoutStateToDb(latestDraftRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") { flushDraft(); flushDb(); }
    };
    const onBeforeUnload = () => { flushDraft(); flushDb(); };

    window.addEventListener("pagehide", flushDraft);
    window.addEventListener("pagehide", flushDb);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      flushDraft();
      window.removeEventListener("pagehide", flushDraft);
      window.removeEventListener("pagehide", flushDb);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [persistDraft, saveWorkoutStateToDb]);

  // ── Persistenza su DB (debounce) ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !restoredRef.current) return;
    const state: WorkoutState = { sessionId, planId, userId: user.id, logs, currentIdx, localExercises };
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    dbTimerRef.current = setTimeout(() => saveWorkoutStateToDb(state), 2000);
    return () => { if (dbTimerRef.current) clearTimeout(dbTimerRef.current); };
  }, [sessionId, planId, user.id, logs, currentIdx, localExercises, saveWorkoutStateToDb]);

  const exercises = localExercises.length > 0 ? localExercises : (planQ.data?.exercises ?? []);
  const current = exercises[currentIdx];

  function buildDraft(patch: Partial<WorkoutState> = {}): WorkoutState | null {
    if (!sessionId) return null;
    return {
      sessionId,
      planId,
      userId: user.id,
      logs,
      currentIdx,
      localExercises,
      ...patch,
    };
  }

  // Query di ricerca esercizi per la sostituzione.
  const searchQ = useQuery({
    queryKey: ["exercise-search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 1) return [];
      const { data } = await supabase
        .from("exercise_library")
        .select("id, name, muscle_group")
        .ilike("name", `%${searchQuery}%`)
        .limit(20);
      return data ?? [];
    },
    enabled: showReplace && searchQuery.length >= 1,
    staleTime: 60_000,
  });

  // Handlers della dialog orfana.
  function decideResume() {
    if (!orphanQ.data?.id) return;
    setOrphanIdAtDecision(orphanQ.data.id);
    setUserDecision("resume");
  }
  function decideStartNew() {
    if (!orphanQ.data?.id) return;
    setOrphanIdAtDecision(orphanQ.data.id);
    setUserDecision("start-new");
  }

  // Mostra la dialog solo se c'è un'orfana e l'utente non ha ancora deciso.
  const showOrphanModal = !!orphanQ.data && !userDecision;
  // Blocca la chiusura dell'AlertDialog tramite escape / click esterno:
  // l'utente DEVE premere "Riprendi" o "Inizia nuovo". Nessuna dispersione.
  // ATTENZIONE: il `return;` è INTENZIONALE — `showOrphanModal` resta `true`
  // fintanto che l'utente non ha scelto esplicitamente. Non aggiornare lo
  // stato in questa callback, altrimenti la forzatura sparisce.
  const blockForcedClose = (next: boolean) => {
    if (!next && !userDecision && orphanQ.data?.id) return;
  };

  async function cancelSession() {
    const ok = await confirmDialog(
      "Annullare l'allenamento?",
      "I dati non saranno salvati.",
    );
    if (!ok) return;
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    if (sessionId) await supabase.from("sessions").delete().eq("id", sessionId);
    sessionStorage.removeItem("gw_last");
    console.log("[CLEANUP] removing LS key");
    clearPersisted();
    navigate({ to: "/" });
  }

  async function finishWorkout() {
    if (!sessionId) return;
    setFinishing(true);
    const rows: {
      session_id: string;
      user_id: string;
      exercise_name: string;
      muscle_group: string | null;
      set_number: number;
      reps: number;
      weight: number;
    }[] = [];
    let totalVolume = 0;
    for (const ex of exercises) {
      const sets = logs[ex.id] ?? [];
      sets.forEach((s, i) => {
        if (s.done && s.reps > 0) {
          rows.push({
            session_id: sessionId,
            user_id: user.id,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            set_number: i + 1,
            reps: s.reps,
            weight: s.weight,
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
    await supabase.from("sessions").update({
      completed_at: new Date().toISOString(),
      total_volume: totalVolume,
      workout_state: null,
    }).eq("id", sessionId);
    sessionStorage.removeItem("gw_last");
    console.log("[CLEANUP] removing LS key");
    clearPersisted();
    toast.success("Allenamento salvato!");
    navigate({ to: "/" });
  }

  function moveExercise(dir: "up" | "down") {
    const idx = currentIdx;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;
    setLocalExercises((prev) => {
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      stageDraft(buildDraft({ localExercises: next, currentIdx: targetIdx }));
      return next;
    });
    setCurrentIdx(targetIdx);
  }

  function replaceExercise(name: string, muscleGroup: string | null) {
    const newExercise: Exercise = {
      id: `custom-${Date.now()}`,
      name,
      muscle_group: muscleGroup,
      sets: 3,
      reps: 10,
      weight: 20,
      notes: null,
    };
    setLocalExercises((prev) => {
      const next = [...prev];
      next[currentIdx] = newExercise;
      stageDraft(buildDraft({
        localExercises: next,
        logs: {
          ...logs,
          [newExercise.id]: Array.from({ length: newExercise.sets }, () => ({
            reps: newExercise.reps,
            weight: Number(newExercise.weight),
            done: false,
          })),
        },
      }));
      return next;
    });
    setLogs((prev) => ({
      ...prev,
      [newExercise.id]: Array.from({ length: newExercise.sets }, () => ({
        reps: newExercise.reps,
        weight: Number(newExercise.weight),
        done: false,
      })),
    }));
    setShowReplace(false);
    setSearchQuery("");
  }

  // Dialog sempre montata (anche in loading) per evitare race se l'utente
  // clicca su "Riprendi" mentre il resto della pagina sta ancora caricando.
  const orphanDialog = (
    <AlertDialog open={showOrphanModal} onOpenChange={blockForcedClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Allenamento in corso</AlertDialogTitle>
          <AlertDialogDescription>
            {orphanQ.data ? (
              <>
                Hai una sessione interrotta iniziata il{" "}
                <strong>
                  {new Date(orphanQ.data.started_at).toLocaleString("it-IT", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
                . Vuoi riprenderla o iniziarne una nuova?
              </>
            ) : (
              "Caricamento…"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={decideStartNew} disabled={!orphanQ.data?.id}>
            Inizia nuovo
          </AlertDialogCancel>
          <AlertDialogAction onClick={decideResume} disabled={!orphanQ.data?.id}>
            Riprendi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (!current) {
    return (
      <div className="container-app flex min-h-screen flex-col items-center justify-center text-center">
        {planQ.data && exercises.length === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">Questa scheda non ha esercizi.</p>
            <button
              onClick={() => navigate({ to: "/schede/$planId", params: { planId } })}
              className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Aggiungi esercizi
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        )}
        {orphanDialog}
        {ConfirmDialog}
      </div>
    );
  }

  const searchResults = searchQ.data ?? [];
  const setsLog = logs[current.id] ?? [];
  const isLast = currentIdx === exercises.length - 1;

  function updateSet(idx: number, patch: Partial<LoggedSet>) {
    setLogs((prev) => {
      const next = {
        ...prev,
        [current.id]: prev[current.id].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      };
      stageDraft(buildDraft({ logs: next }));
      return next;
    });
  }

  async function removeSet(idx: number) {
    const ok = await confirmDialog(
      "Rimuovere questa serie?",
      "I dati inseriti per questa serie andranno persi.",
    );
    if (!ok) return;
    setLogs((prev) => {
      const next = {
        ...prev,
        [current.id]: prev[current.id].filter((_, i) => i !== idx),
      };
      stageDraft(buildDraft({ logs: next }));
      return next;
    });
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
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentIdx + 1) / exercises.length) * 100}%` }}
          />
        </div>

        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {current.muscle_group ?? "Esercizio"}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight">{current.name}</h1>
          <button
            type="button"
            onClick={() => setShowReplace(true)}
            className="rounded-full border border-border p-2 text-muted-foreground"
            aria-label="Sostituisci esercizio"
            title="Sostituisci con un altro esercizio"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => moveExercise("up")}
              disabled={currentIdx === 0}
              className="rounded-full border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
              aria-label="Sposta su"
              title="Sposta questo esercizio prima"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveExercise("down")}
              disabled={currentIdx === exercises.length - 1}
              className="rounded-full border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
              aria-label="Sposta giù"
              title="Sposta questo esercizio dopo"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Target: {current.sets} × {current.reps} @ {fmtWeight(Number(current.weight))}
        </p>
        {current.notes && <p className="mt-2 rounded-xl bg-muted p-3 text-sm">{current.notes}</p>}

        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <div>Set</div>
            <div className="text-center">Rip.</div>
            <div className="text-center">Kg</div>
            <div />
            <div />
          </div>
          {setsLog.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2rem] items-center gap-2 rounded-2xl border p-2 ${
                s.done ? "border-foreground bg-foreground/5" : "border-border bg-card"
              }`}
            >
              <div className="text-center text-lg font-black">{i + 1}</div>
              <StepperInput value={s.reps} onChange={(v) => updateSet(i, { reps: v })} step={1} />
              <StepperInput
                value={s.weight}
                onChange={(v) => updateSet(i, { weight: v })}
                step={2.5}
              />
              <button
                onClick={() => updateSet(i, { done: !s.done })}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  s.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                }`}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeSet(i)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label="Rimuovi serie"
                title="Rimuovi serie"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setLogs((p) => {
                const next = {
                  ...p,
                  [current.id]: [
                    ...p[current.id],
                    { reps: current.reps, weight: Number(current.weight), done: false },
                  ],
                };
                stageDraft(buildDraft({ logs: next }));
                return next;
              });
            }}
            className="w-full rounded-2xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground"
          >
            + Serie extra
          </button>
        </div>

        {/* Storico: le ultime volte per questo esercizio */}
        <ExerciseHistory exerciseName={current.name} />

        {/* TASK 4 timer (estratto) */}
        <RestTimer />
      </div>

      {/* Footer */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="container-app flex gap-2 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {currentIdx > 0 && (
            <button
              onClick={() => {
                const nextIdx = currentIdx - 1;
                stageDraft(buildDraft({ currentIdx: nextIdx }));
                setCurrentIdx(nextIdx);
              }}
              className="rounded-full border border-border px-5 py-3.5 text-sm font-semibold"
            >
              Indietro
            </button>
          )}
          {!isLast ? (
            <>
              <button
                onClick={() => {
                  const nextIdx = currentIdx + 1;
                  stageDraft(buildDraft({ currentIdx: nextIdx }));
                  setCurrentIdx(nextIdx);
                }}
                className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
              >
                Prossimo esercizio
              </button>
              <button
                onClick={async () => {
                  const ok = await confirmDialog(
                    "Salvare l'allenamento?",
                    "Verranno salvate solo le serie completate.",
                  );
                  if (ok) finishWorkout();
                }}
                disabled={finishing}
                className="rounded-full border border-border px-5 py-3.5 text-sm font-semibold"
              >
                {finishing ? "..." : "Termina"}
              </button>
            </>
          ) : (
            <button
              onClick={finishWorkout}
              disabled={finishing}
              className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
            >
              {finishing ? "..." : "Termina allenamento"}
            </button>
          )}
        </div>
      </div>

      {orphanDialog}

      {/* Sostituisci esercizio dialog */}
      <AlertDialog open={showReplace} onOpenChange={setShowReplace}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Sostituisci esercizio</AlertDialogTitle>
            <AlertDialogDescription>
              Cerca un esercizio dalla libreria per sostituire "{current.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="relative mb-1 mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca esercizio…"
              className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground"
              autoFocus
            />
          </div>
          <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Non è obbligatorio scegliere dalla lista
          </p>
          <div className="space-y-1">
            {searchQuery.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Inizia a digitare per cercare</p>
            ) : searchQ.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Ricerca…</p>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Nessun esercizio trovato</p>
                <button
                  type="button"
                  onClick={() => replaceExercise(searchQuery, null)}
                  className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Usa "{searchQuery}"
                </button>
              </div>
            ) : (
              searchResults.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => replaceExercise(ex.name, ex.muscle_group)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-muted"
                >
                  <div>
                    <div className="text-sm font-semibold">{ex.name}</div>
                    <div className="text-xs text-muted-foreground">{ex.muscle_group}</div>
                  </div>
                  <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {ConfirmDialog}
    </div>
  );
}

function StepperInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (n: number) => void;
  step: number;
}) {
  const [text, setText] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        value={text}
        inputMode="decimal"
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw !== "") {
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(Math.max(0, n));
          }
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (text === "") {
            onChange(0);
            setText("0");
          } else {
            setText(String(value));
          }
        }}
        className="w-12 bg-transparent text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
