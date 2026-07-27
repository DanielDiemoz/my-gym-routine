import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import { useLanguage } from "@/lib/i18n";
import { SessionLogInsertSchema } from "@/lib/validators";

export const Route = createFileRoute("/app/allena/$planId")({
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
  try {
    localStorage.setItem(WS_KEY, stateStr);
  } catch {
    /* localStorage may be full or unavailable (private browsing) */
  }
}

function restore(): string | null {
  if (_cached) return _cached;
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (raw) _cached = raw;
    return raw;
  } catch {
    return null;
  }
}

function clearPersisted() {
  _cached = null;
  try {
    localStorage.removeItem(WS_KEY);
  } catch {
    /* localStorage may be unavailable */
  }
}

// Sempre attivo: prima di chiudere la pagina, salva l'ultimo stato.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_cached)
      try {
        localStorage.setItem(WS_KEY, _cached);
      } catch {
        /* best-effort persistence on page close */
      }
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
  const { t, language } = useLanguage();
  const intlLocale = language === "en" ? "en-US" : "it-IT";

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
  const [showOrphanModal, setShowOrphanModal] = useState(false);
  const [orphanId, setOrphanId] = useState<string | null>(null);
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();

  // Copia mutabile degli esercizi (per la sostituzione in sessione).
  const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
  const [showReplace, setShowReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workCtx, setData: setWorkCtx } = useWorkoutStash();

  const latestDraftRef = useRef<WorkoutState | null>(null);
  const persistDraft = useCallback(
    (state: WorkoutState | null) => {
      if (!state?.sessionId) return;
      console.log(
        "[PERSIST] saving to LS",
        state.sessionId,
        "logs:",
        Object.keys(state.logs ?? {}).length,
        "exercises",
      );
      persist(JSON.stringify(state));
      setWorkCtx(JSON.stringify(state));
    },
    [setWorkCtx],
  );
  const stageDraft = useCallback((state: WorkoutState | null) => {
    if (!state?.sessionId) return;
    latestDraftRef.current = state;
    console.log(
      "[PERSIST] stageDraft saving to LS",
      state.sessionId,
      "logs:",
      Object.keys(state.logs ?? {}).length,
      "exercises",
    );
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

  // ── Session creation mutation (replaces race-prone useEffect) ──────────
  // This mutation is atomic and idempotent:
  //   - "resume": reuses the orphanId snapshot, no DB write needed
  //   - "new": inserts a new session, then deletes the orphan (best-effort)
  // The mutation guard prevents double-fire even in StrictMode.
  const createSession = useMutation({
    mutationFn: async (
      opts: { action: "resume"; orphanId: string } | { action: "new"; planName: string },
    ) => {
      if (opts.action === "resume") {
        return opts.orphanId;
      }
      // Insert new session first (safe even if orphan still exists)
      const { data, error } = await supabase
        .from("sessions")
        .insert({ user_id: user.id, plan_id: planId, plan_name: opts.planName })
        .select("id")
        .single();
      if (error) throw error;

      // Best-effort cleanup of orphan (non-blocking)
      if (opts.orphanId) {
        supabase
          .from("sessions")
          .delete()
          .eq("id", opts.orphanId)
          .then(({ error: delErr }) => {
            if (delErr) console.warn("Orphan cleanup failed:", delErr.message);
          });
      }
      return data.id as string;
    },
    onSuccess: (resolvedId: string) => {
      setSessionId(resolvedId);
      setShowOrphanModal(false);
      sessionStorage.setItem(
        "gw_last",
        JSON.stringify({
          sessionId: resolvedId,
          planId,
          userId: user.id,
          logs: {},
          currentIdx: 0,
          localExercises: [],
        }),
      );
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("Errore di sessione", "Session error"));
    },
  });

  // ── Orphan detection: one-shot query that decides the flow ────────────
  // We use a single useEffect that runs once when data is ready, then
  // decides: auto-resume (sessionStorage match), show dialog, or create new.
  const orphanHandledRef = useRef(false);
  useEffect(() => {
    if (orphanHandledRef.current) return;
    if (!planQ.data?.plan) return;
    if (orphanQ.isLoading || orphanQ.isFetching) return;

    const orphan = orphanQ.data;
    if (!orphan) {
      // No orphan → create new session immediately
      orphanHandledRef.current = true;
      createSession.mutate({ action: "new", planName: planQ.data.plan.name });
      return;
    }

    // Orphan exists → check if it matches sessionStorage (auto-resume)
    const last = JSON.parse(sessionStorage.getItem("gw_last") ?? "null") as WorkoutState | null;
    const ctxData = JSON.parse(workCtx ?? "null") as WorkoutState | null;
    const matchesSessionStorage =
      (last?.sessionId === orphan.id && last?.planId === planId) ||
      ctxData?.sessionId === orphan.id;

    if (matchesSessionStorage) {
      orphanHandledRef.current = true;
      createSession.mutate({ action: "resume", orphanId: orphan.id });
      return;
    }

    // Otherwise, show dialog and let user decide
    orphanHandledRef.current = true;
    setOrphanId(orphan.id);
    setShowOrphanModal(true);
  }, [planQ.data, orphanQ.data, orphanQ.isLoading, orphanQ.isFetching, planId, workCtx]);

  function decideResume() {
    if (!orphanId) return;
    setShowOrphanModal(false);
    createSession.mutate({ action: "resume", orphanId });
  }

  function decideStartNew() {
    if (!orphanId || !planQ.data?.plan) return;
    setShowOrphanModal(false);
    createSession.mutate({ action: "new", planName: planQ.data.plan.name });
  }

  // Force-close blocker: user MUST pick resume or new
  const blockForcedClose = (next: boolean) => {
    if (!next && showOrphanModal) return;
  };

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
    if (!sessionId) {
      console.log("[RESTORE] no sessionId yet");
      return;
    }
    if (restoredRef.current) {
      console.log("[RESTORE] already restored");
      return;
    }

    if (orphanQ.isLoading) {
      console.log("[RESTORE] waiting for orphanQ");
      return;
    }
    if (!orphanQ.data && orphanQ.isFetching) {
      console.log("[RESTORE] waiting for orphanQ");
      return;
    }

    restoredRef.current = true;
    skipNextPersistRef.current = true;

    console.log(
      "[RESTORE] attempting restore for sessionId:",
      sessionId,
      "planId:",
      planId,
      "userId:",
      user.id,
    );
    let saved: WorkoutState | null = null;
    try {
      const raw = restore();
      if (raw) saved = JSON.parse(raw) as WorkoutState;
    } catch {
      /* corrupted localStorage data, will start fresh */
    }

    console.log("[RESTORE] localStorage found:", !!saved, "sessionId:", saved?.sessionId);
    if (!saved) {
      console.log("[RESTORE] no valid state to restore");
      return;
    }
    console.log("[RESTORE] sessionId match:", saved.sessionId === sessionId);
    if (saved.sessionId !== sessionId) {
      console.log("[RESTORE] no valid state to restore");
      return;
    }
    console.log("[RESTORE] planId match:", saved.planId === planId);
    if (saved.planId !== planId) {
      console.log("[RESTORE] no valid state to restore");
      return;
    }
    console.log("[RESTORE] userId match:", saved.userId === user.id);
    if (saved.userId !== user.id) {
      console.log("[RESTORE] no valid state to restore");
      return;
    }

    console.log("[RESTORE] restoring with", Object.keys(saved?.logs ?? {}).length, "exercises");
    latestDraftRef.current = {
      sessionId,
      planId,
      userId: user.id,
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
  }, [
    sessionId,
    orphanQ.data,
    orphanQ.isLoading,
    orphanQ.isFetching,
    planId,
    user.id,
    planQ.data?.exercises,
  ]);

  // ── Persistenza ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || !restoredRef.current) return;
    latestDraftRef.current = {
      sessionId,
      planId,
      userId: user.id,
      logs,
      currentIdx,
      localExercises,
    };
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    persistDraft(latestDraftRef.current);
  }, [sessionId, planId, user.id, logs, currentIdx, localExercises, persistDraft]);

  useEffect(() => {
    const flushDraft = () => {
      console.log("[FLUSH] flushing draft on close");
      persistDraft(latestDraftRef.current);
    };
    const flushDb = () => {
      if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
      saveWorkoutStateToDb(latestDraftRef.current);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushDraft();
        flushDb();
      }
    };
    const onBeforeUnload = () => {
      flushDraft();
      flushDb();
    };

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
    const state: WorkoutState = {
      sessionId,
      planId,
      userId: user.id,
      logs,
      currentIdx,
      localExercises,
    };
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    dbTimerRef.current = setTimeout(() => saveWorkoutStateToDb(state), 2000);
    return () => {
      if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    };
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

  // Handlers della dialog orfana — definiti sopra con il mutation.

  async function cancelSession() {
    const ok = await confirmDialog(
      t("Annullare l'allenamento?", "Cancel the workout?"),
      t("I dati non saranno salvati.", "Your data won't be saved."),
    );
    if (!ok) return;
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    if (sessionId) await supabase.from("sessions").delete().eq("id", sessionId);
    sessionStorage.removeItem("gw_last");
    console.log("[CLEANUP] removing LS key");
    clearPersisted();
    navigate({ to: "/app" });
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
      toast.error(t("Nessuna serie completata", "No completed sets"));
      setFinishing(false);
      return;
    }

    // Validate rows before insert — catches corrupt state early
    const parsed = SessionLogInsertSchema.safeParse(rows[0]);
    if (!parsed.success) {
      toast.error(t("Dati serie non validi", "Invalid set data"));
      setFinishing(false);
      return;
    }

    await supabase.from("session_logs").insert(rows);
    await supabase
      .from("sessions")
      .update({
        completed_at: new Date().toISOString(),
        total_volume: totalVolume,
        workout_state: null,
      })
      .eq("id", sessionId);
    sessionStorage.removeItem("gw_last");
    console.log("[CLEANUP] removing LS key");
    clearPersisted();

    // Check for new PRs
    try {
      const { data: existingLogs } = await supabase
        .from("session_logs")
        .select("exercise_name, weight")
        .eq("user_id", user.id)
        .not("session_id", "eq", sessionId);

      const prMap = new Map<string, number>();
      for (const log of existingLogs ?? []) {
        const name = log.exercise_name.trim().toLowerCase();
        const current = prMap.get(name) ?? 0;
        if (log.weight > current) prMap.set(name, log.weight);
      }

      const newPRs: string[] = [];
      for (const row of rows) {
        const name = row.exercise_name.trim().toLowerCase();
        const oldPR = prMap.get(name) ?? 0;
        if (row.weight > oldPR) {
          newPRs.push(row.exercise_name);
          prMap.set(name, row.weight);
        }
      }

      if (newPRs.length > 0) {
        const unique = [...new Set(newPRs)];
        for (const ex of unique) {
          toast.success(t(`🏆 Nuovo PR! ${ex}`, `🏆 New PR! ${ex}`), { duration: 5000 });
        }
      }
    } catch {
      // PR check is best-effort, don't block workout save
    }

    toast.success(t("Allenamento salvato!", "Workout saved!"));
    navigate({ to: "/app" });
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
      stageDraft(
        buildDraft({
          localExercises: next,
          logs: {
            ...logs,
            [newExercise.id]: Array.from({ length: newExercise.sets }, () => ({
              reps: newExercise.reps,
              weight: Number(newExercise.weight),
              done: false,
            })),
          },
        }),
      );
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

  const orphanDialog = (
    <AlertDialog open={showOrphanModal} onOpenChange={blockForcedClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Allenamento in corso", "Workout in progress")}</AlertDialogTitle>
          <AlertDialogDescription>
            {orphanQ.data ? (
              <>
                {t(
                  "Hai una sessione interrotta iniziata il",
                  "You have a paused session started on",
                )}{" "}
                <strong>
                  {new Date(orphanQ.data.started_at).toLocaleString(intlLocale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </strong>
                .{" "}
                {t(
                  "Vuoi riprenderla o iniziarne una nuova?",
                  "Do you want to resume it or start a new one?",
                )}
              </>
            ) : (
              t("Caricamento…", "Loading…")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={decideStartNew} disabled={!orphanId}>
            {t("Inizia nuovo", "Start new")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={decideResume} disabled={!orphanId}>
            {t("Riprendi", "Resume")}
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
            <p className="text-sm text-muted-foreground">
              {t("Questa scheda non ha esercizi.", "This plan has no exercises.")}
            </p>
            <button
              onClick={() => navigate({ to: "/app/schede/$planId", params: { planId } })}
              className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              {t("Aggiungi esercizi", "Add exercises")}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("Caricamento…", "Loading…")}</p>
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

  if (!current) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="container-app pt-6">
          <p className="text-sm text-muted-foreground">{t("Caricamento…", "Loading…")}</p>
        </div>
      </div>
    );
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

        <div
          className="mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{
            backgroundColor: `${muscleColor(current.muscle_group)} / 15%`,
            color: muscleColor(current.muscle_group),
          }}
        >
          {current.muscle_group
            ? t(current.muscle_group, MUSCLE_EN[current.muscle_group] ?? current.muscle_group)
            : t("Esercizio", "Exercise")}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight">{current.name}</h1>
          <button
            type="button"
            onClick={() => setShowReplace(true)}
            className="rounded-full border border-border p-2 text-muted-foreground"
            aria-label={t("Sostituisci esercizio", "Replace exercise")}
            title={t("Sostituisci con un altro esercizio", "Replace with another exercise")}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => moveExercise("up")}
              disabled={currentIdx === 0}
              className="rounded-full border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
              aria-label={t("Sposta su", "Move up")}
              title={t("Sposta questo esercizio prima", "Move this exercise earlier")}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveExercise("down")}
              disabled={currentIdx === exercises.length - 1}
              className="rounded-full border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
              aria-label={t("Sposta giù", "Move down")}
              title={t("Sposta questo esercizio dopo", "Move this exercise later")}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Target", "Target")}: {current.sets} × {current.reps} @{" "}
          {fmtWeight(Number(current.weight))}
        </p>
        {current.notes && <p className="mt-2 rounded-xl bg-muted p-3 text-sm">{current.notes}</p>}

        <div className="mt-6 space-y-2">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <div>{t("Set", "Set")}</div>
            <div className="text-center">{t("Rip.", "Reps")}</div>
            <div className="text-center">{t("Kg", "Kg")}</div>
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
                  s.done
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                }`}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => removeSet(i)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("Rimuovi serie", "Remove set")}
                title={t("Rimuovi serie", "Remove set")}
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
            + {t("Serie extra", "Extra set")}
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
              {t("Indietro", "Back")}
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
                {t("Prossimo esercizio", "Next exercise")}
              </button>
              <button
                onClick={async () => {
                  const ok = await confirmDialog(
                    t("Salvare l'allenamento?", "Save the workout?"),
                    t(
                      "Verranno salvate solo le serie completate.",
                      "Only completed sets will be saved.",
                    ),
                  );
                  if (ok) finishWorkout();
                }}
                disabled={finishing}
                className="rounded-full border border-border px-5 py-3.5 text-sm font-semibold"
              >
                {finishing ? "..." : t("Termina", "Finish")}
              </button>
            </>
          ) : (
            <button
              onClick={finishWorkout}
              disabled={finishing}
              className="flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
            >
              {finishing ? "..." : t("Termina allenamento", "Finish workout")}
            </button>
          )}
        </div>
      </div>

      {orphanDialog}

      {/* Sostituisci esercizio dialog */}
      <AlertDialog open={showReplace} onOpenChange={setShowReplace}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Sostituisci esercizio", "Replace exercise")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Cerca un esercizio dalla libreria per sostituire",
                "Search the library to replace",
              )}{" "}
              "{current.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="relative mb-1 mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("Cerca esercizio…", "Search exercise…")}
              className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-foreground"
              autoFocus
            />
          </div>
          <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            {t("Non è obbligatorio scegliere dalla lista", "You don't have to pick from the list")}
          </p>
          <div className="space-y-1">
            {searchQuery.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("Inizia a digitare per cercare", "Start typing to search")}
              </p>
            ) : searchQ.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("Ricerca…", "Searching…")}
              </p>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("Nessun esercizio trovato", "No exercise found")}
                </p>
                <button
                  type="button"
                  onClick={() => replaceExercise(searchQuery, null)}
                  className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  {t("Usa", "Use")} "{searchQuery}"
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
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${muscleColor(ex.muscle_group)} / 15%`,
                        color: muscleColor(ex.muscle_group),
                      }}
                    >
                      {ex.muscle_group
                        ? t(ex.muscle_group, MUSCLE_EN[ex.muscle_group] ?? ex.muscle_group)
                        : ex.muscle_group}
                    </span>
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
