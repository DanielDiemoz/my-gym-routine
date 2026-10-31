import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X,
  Check,
  Plus,
  Minus,
  RotateCcw,
  Search,
  ChevronUp,
  ChevronDown,
  Trophy,
  Share2,
  Flame,
  Sparkles,
  Clock,
  Dumbbell,
} from "lucide-react";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExerciseHistory } from "@/components/ExerciseHistory";
import { RestTimer, triggerRestTimerAutoStart } from "@/components/RestTimer";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
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
import { getRank, rankName, nextRankName } from "@/lib/ranks";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/allena/$planId")({
  component: ActiveSession,
});

// ── Persistenza modulo (indipendente da React) ──────────────────────────
const WS_KEY = "gw_ws";
let _cached: string | null = null;

function persist(stateStr: string) {
  _cached = stateStr;
  try {
    localStorage.setItem(WS_KEY, stateStr);
  } catch {}
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
  } catch {}
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_cached)
      try {
        localStorage.setItem(WS_KEY, _cached);
      } catch {}
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

type SetType = "normal" | "warmup" | "dropset" | "failure";

type LoggedSet = {
  reps: number;
  weight: number;
  done: boolean;
  type?: SetType;
};

type OrphanSession = { id: string; started_at: string; workout_state: Json | null };

type WorkoutState = {
  sessionId: string;
  planId?: string;
  userId?: string;
  logs: Record<string, LoggedSet[]>;
  currentIdx: number;
  localExercises: Exercise[];
};

type WorkoutRecapData = {
  planName: string;
  durationMinutes: number;
  totalVolume: number;
  completedSets: number;
  exercisesCount: number;
  newPRs: Array<{ name: string; weight: number }>;
  totalWorkouts: number;
};

const SET_TYPES_ORDER: SetType[] = ["normal", "warmup", "dropset", "failure"];

function nextSetType(current?: SetType): SetType {
  const idx = SET_TYPES_ORDER.indexOf(current ?? "normal");
  return SET_TYPES_ORDER[(idx + 1) % SET_TYPES_ORDER.length];
}

function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function ActiveSession() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cancelledRef = useRef(false);
  const sessionStartMsRef = useRef<number>(Date.now());

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
  const [recap, setRecap] = useState<WorkoutRecapData | null>(null);
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
  const persistDraft = useCallback(
    (state: WorkoutState | null) => {
      if (!state?.sessionId) return;
      persist(JSON.stringify(state));
      setWorkCtx(JSON.stringify(state));
    },
    [setWorkCtx],
  );
  const stageDraft = useCallback((state: WorkoutState | null) => {
    if (!state?.sessionId) return;
    latestDraftRef.current = state;
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
  useEffect(() => {
    if (sessionCreated.current) return;
    if (!planQ.data?.plan || orphanQ.isLoading || sessionId) return;
    if (!orphanQ.data && orphanQ.isFetching) return;

    const orphan = orphanQ.data;
    if (orphan && !userDecision) {
      const last = JSON.parse(sessionStorage.getItem("gw_last") ?? "null") as WorkoutState | null;
      const ctxData = JSON.parse(workCtx ?? "null") as WorkoutState | null;
      const match =
        (last?.sessionId === orphan.id && last?.planId === planId) ||
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

    (async () => {
      try {
        let resolvedId: string | null = null;

        if (userDecision === "resume" && orphanIdAtDecision) {
          resolvedId = orphanIdAtDecision;
          if (orphanQ.data?.started_at) {
            sessionStartMsRef.current = new Date(orphanQ.data.started_at).getTime();
          }
        } else if (planQ.data?.plan) {
          const { data, error } = await supabase
            .from("sessions")
            .insert({
              user_id: user.id,
              plan_id: planId,
              plan_name: planQ.data.plan.name,
            })
            .select("id, started_at")
            .single();
          if (cancelled) return;
          if (error) throw error;
          resolvedId = data?.id ?? null;
          if (data?.started_at) {
            sessionStartMsRef.current = new Date(data.started_at).getTime();
          }

          if (userDecision === "start-new" && orphanIdAtDecision) {
            const { error: delErr } = await supabase
              .from("sessions")
              .delete()
              .eq("id", orphanIdAtDecision);
            if (delErr) {
              console.warn("Cleanup vecchia sessione fallito:", delErr.message);
            }
          }
        }

        if (!cancelled && resolvedId) {
          setSessionId(resolvedId);
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
        }
      } catch (err) {
        if (cancelled) return;
        sessionCreated.current = false;
        toast.error(err instanceof Error ? err.message : t("Errore di sessione", "Session error"));
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
            type: "normal",
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
    if (!sessionId) return;
    if (restoredRef.current) return;
    if (orphanQ.isLoading) return;
    if (!orphanQ.data && orphanQ.isFetching) return;

    restoredRef.current = true;
    skipNextPersistRef.current = true;

    let saved: WorkoutState | null = null;
    try {
      const raw = restore();
      if (raw) saved = JSON.parse(raw) as WorkoutState;
    } catch {}

    if (!saved) return;
    if (saved.sessionId !== sessionId) return;
    if (saved.planId !== planId) return;
    if (saved.userId !== user.id) return;

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
              type: "normal",
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
      if (cancelledRef.current) return;
      persistDraft(latestDraftRef.current);
    };
    const flushDb = () => {
      if (cancelledRef.current) return;
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

  // Storico per "Ghost Values" (serie della volta precedente)
  const exHistoryQ = useExerciseHistory(current?.name);
  const previousSets = exHistoryQ.data?.[0]?.sets ?? [];

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

  const showOrphanModal = !!orphanQ.data && !userDecision;
  const blockForcedClose = (next: boolean) => {
    if (!next && !userDecision && orphanQ.data?.id) return;
  };

  async function cancelSession() {
    const ok = await confirmDialog(
      t("Annullare l'allenamento?", "Cancel the workout?"),
      t("I dati non saranno salvati.", "Your data won't be saved."),
    );
    if (!ok) return;
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .is("completed_at", null);
    if (error) {
      toast.error(t("Errore nell'annullamento", "Error cancelling workout"));
      return;
    }
    sessionStorage.removeItem("gw_last");
    clearPersisted();
    setWorkCtx(null);
    cancelledRef.current = true;
    qc.invalidateQueries({ queryKey: ["active-session", user.id] });
    qc.invalidateQueries({ queryKey: ["has-active-session", user.id, planId] });
    qc.invalidateQueries({ queryKey: ["orphan-session", user.id, planId] });
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
      isWarmup?: boolean;
    }[] = [];
    let totalVolume = 0;
    let trainedExercises = 0;
    for (const ex of exercises) {
      const sets = logs[ex.id] ?? [];
      let exHasDone = false;
      sets.forEach((s, i) => {
        if (s.done && s.reps > 0) {
          exHasDone = true;
          rows.push({
            session_id: sessionId,
            user_id: user.id,
            exercise_name: ex.name,
            muscle_group: ex.muscle_group,
            set_number: i + 1,
            reps: s.reps,
            weight: s.weight,
            isWarmup: s.type === "warmup",
          });
          totalVolume += s.reps * s.weight;
        }
      });
      if (exHasDone) trainedExercises++;
    }
    if (rows.length === 0) {
      toast.error(t("Nessuna serie completata", "No completed sets"));
      setFinishing(false);
      return;
    }

    const dbRows = rows.map(({ isWarmup: _w, ...rest }) => rest);
    await supabase.from("session_logs").insert(dbRows);
    await supabase
      .from("sessions")
      .update({
        completed_at: new Date().toISOString(),
        total_volume: totalVolume,
        workout_state: null,
      })
      .eq("id", sessionId);
    sessionStorage.removeItem("gw_last");
    clearPersisted();
    setWorkCtx(null);
    cancelledRef.current = true;

    // Check for new PRs & total workouts count
    const unlockedPRs: Array<{ name: string; weight: number }> = [];
    let totalWorkoutsCount = 1;
    try {
      const [{ data: existingLogs }, { count: completedCount }] = await Promise.all([
        supabase
          .from("session_logs")
          .select("exercise_name, weight")
          .eq("user_id", user.id)
          .not("session_id", "eq", sessionId),
        supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .not("completed_at", "is", null),
      ]);

      totalWorkoutsCount = completedCount ?? 1;

      const prMap = new Map<string, number>();
      for (const log of existingLogs ?? []) {
        const name = log.exercise_name.trim().toLowerCase();
        const curr = prMap.get(name) ?? 0;
        if (log.weight > curr) prMap.set(name, log.weight);
      }

      const prBestInSession = new Map<string, { name: string; weight: number }>();
      for (const row of rows) {
        if (row.isWarmup) continue;
        const name = row.exercise_name.trim().toLowerCase();
        const oldPR = prMap.get(name) ?? 0;
        if (row.weight > oldPR && row.weight > 0) {
          prMap.set(name, row.weight);
          prBestInSession.set(name, { name: row.exercise_name, weight: row.weight });
        }
      }
      unlockedPRs.push(...prBestInSession.values());
    } catch {
      // PR check is best-effort
    }

    qc.invalidateQueries({ queryKey: ["active-session", user.id] });
    qc.invalidateQueries({ queryKey: ["week-stats", user.id] });
    qc.invalidateQueries({ queryKey: ["streak", user.id] });

    const durationMinutes = Math.max(
      1,
      Math.round((Date.now() - sessionStartMsRef.current) / 60_000),
    );

    setFinishing(false);
    setRecap({
      planName: planQ.data?.plan?.name ?? t("Allenamento", "Workout"),
      durationMinutes,
      totalVolume,
      completedSets: rows.length,
      exercisesCount: trainedExercises,
      newPRs: unlockedPRs,
      totalWorkouts: totalWorkoutsCount,
    });
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
              type: "normal",
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
        type: "normal",
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
          <AlertDialogCancel onClick={decideStartNew} disabled={!orphanQ.data?.id}>
            {t("Inizia nuovo", "Start new")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={decideResume} disabled={!orphanQ.data?.id}>
            {t("Riprendi", "Resume")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Se l'allenamento è terminato mostriamo la schermata celebrativa Workout Recap
  if (recap) {
    return (
      <WorkoutRecapView
        recap={recap}
        fmtWeight={fmtWeight}
        onDone={() => navigate({ to: "/app" })}
      />
    );
  }

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

  // Calcolo serie totali completate nell'intero workout per la progress bar
  const totalWorkoutSets = exercises.reduce((acc, ex) => acc + (logs[ex.id]?.length ?? ex.sets), 0);
  const completedWorkoutSets = exercises.reduce(
    (acc, ex) => acc + (logs[ex.id]?.filter((s) => s.done).length ?? 0),
    0,
  );

  function updateSet(idx: number, patch: Partial<LoggedSet>) {
    setLogs((prev) => {
      const currentSets = prev[current.id] ?? [];
      const wasDone = currentSets[idx]?.done ?? false;
      const next = {
        ...prev,
        [current.id]: currentSets.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      };
      stageDraft(buildDraft({ logs: next }));

      if (patch.done === true && !wasDone) {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(40);
          } catch {}
        }
        triggerRestTimerAutoStart();
      }
      return next;
    });
  }

  async function removeSet(idx: number) {
    const ok = await confirmDialog(
      t("Rimuovere questa serie?", "Remove this set?"),
      t("I dati inseriti per questa serie andranno persi.", "Set data will be lost."),
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
    <div className="min-h-screen bg-background pb-36">
      <div className="container-app pt-safe-sm">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={cancelSession}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95"
            aria-label={t("Annulla allenamento", "Cancel workout")}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {planQ.data?.plan?.name ?? t("Sessione attiva", "Active session")}
            </div>
            <div className="text-xs font-extrabold tabular-nums">
              {completedWorkoutSets} / {totalWorkoutSets} {t("serie completate", "sets done")}
            </div>
          </div>
          <button
            onClick={async () => {
              const ok = await confirmDialog(
                t("Terminare l'allenamento?", "Finish workout?"),
                t(
                  "Verranno salvate tutte le serie spuntate come completate.",
                  "All checked sets will be saved.",
                ),
              );
              if (ok) finishWorkout();
            }}
            disabled={finishing}
            className="rounded-full bg-primary/15 px-3.5 py-2 text-xs font-extrabold text-primary transition hover:bg-primary/25 active:scale-95"
          >
            {finishing ? "..." : t("Fine", "Finish")}
          </button>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-300"
            style={{
              width: `${
                totalWorkoutSets > 0
                  ? Math.max(5, (completedWorkoutSets / totalWorkoutSets) * 100)
                  : ((currentIdx + 1) / exercises.length) * 100
              }%`,
            }}
          />
        </div>

        {/* Interactive Exercise Pill Carousel */}
        <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {exercises.map((ex, idx) => {
            const exSets = logs[ex.id] ?? [];
            const allDone = exSets.length > 0 && exSets.every((s) => s.done);
            const someDone = exSets.some((s) => s.done);
            const isActive = idx === currentIdx;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  stageDraft(buildDraft({ currentIdx: idx }));
                  setCurrentIdx(idx);
                }}
                className={`no-tap-highlight flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : allDone
                      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : someDone
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : allDone
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {allDone ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                </span>
                <span className="max-w-[7.5rem] truncate">{ex.name}</span>
              </button>
            );
          })}
        </div>

        {/* Current Exercise Header */}
        <div className="bento-card rounded-3xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div
                className="mb-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest"
                style={{
                  backgroundColor: `${muscleColor(current.muscle_group)} / 15%`,
                  color: muscleColor(current.muscle_group),
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: muscleColor(current.muscle_group) }}
                />
                {current.muscle_group
                  ? t(current.muscle_group, MUSCLE_EN[current.muscle_group] ?? current.muscle_group)
                  : t("Esercizio", "Exercise")}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{current.name}</h1>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowReplace(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground"
                aria-label={t("Sostituisci esercizio", "Replace exercise")}
                title={t("Sostituisci con un altro esercizio", "Replace with another exercise")}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveExercise("up")}
                disabled={currentIdx === 0}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                aria-label={t("Sposta su", "Move up")}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveExercise("down")}
                disabled={currentIdx === exercises.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
                aria-label={t("Sposta giù", "Move down")}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-lg bg-muted px-2.5 py-1 font-bold text-foreground tabular-nums">
              {t("Target", "Target")}: {current.sets} × {current.reps} @{" "}
              {fmtWeight(Number(current.weight))}
            </span>
            <span className="text-[11px]">
              {t(
                "Tocca il numero Set per cambiare tipo (W/D/F)",
                "Tap Set # to cycle type (W/D/F)",
              )}
            </span>
          </div>

          {current.notes && (
            <p className="mt-3 rounded-2xl border border-border/60 bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
              📝 {current.notes}
            </p>
          )}
        </div>

        {/* Sets List */}
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2rem] gap-2 px-2 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
            <div className="text-center">{t("Set", "Set")}</div>
            <div className="text-center">{t("Rip.", "Reps")}</div>
            <div className="text-center">{t("Carico", "Weight")}</div>
            <div />
            <div />
          </div>

          {setsLog.map((s, i) => {
            const prevSet = previousSets[i];
            const est1rm = estimate1RM(s.weight, s.reps);
            const setType = s.type ?? "normal";

            const badgeMeta =
              setType === "warmup"
                ? {
                    label: "W",
                    title: t("Riscaldamento", "Warmup"),
                    cls: "bg-amber-500/15 text-amber-500 border-amber-500/30",
                  }
                : setType === "dropset"
                  ? {
                      label: "D",
                      title: "Drop Set",
                      cls: "bg-sky-500/15 text-sky-500 border-sky-500/30",
                    }
                  : setType === "failure"
                    ? {
                        label: "F",
                        title: t("Cedimento", "Failure"),
                        cls: "bg-rose-500/15 text-rose-500 border-rose-500/30",
                      }
                    : {
                        label: String(i + 1),
                        title: t("Serie normale", "Working set"),
                        cls: "bg-muted text-foreground border-transparent",
                      };

            return (
              <div
                key={i}
                className={`rounded-2xl border p-2.5 transition-all ${
                  s.done
                    ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-2xs"
                    : "bento-card"
                }`}
              >
                <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem_2rem] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSet(i, { type: nextSetType(setType) })}
                    title={badgeMeta.title}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-black tabular-nums transition active:scale-90 ${badgeMeta.cls}`}
                  >
                    {badgeMeta.label}
                  </button>

                  <StepperInput
                    value={s.reps}
                    onChange={(v) => updateSet(i, { reps: v })}
                    step={1}
                  />
                  <StepperInput
                    value={s.weight}
                    onChange={(v) => updateSet(i, { weight: v })}
                    step={2.5}
                  />

                  <button
                    type="button"
                    onClick={() => updateSet(i, { done: !s.done })}
                    aria-label={
                      s.done
                        ? t("Segna come non completata", "Mark incomplete")
                        : t("Segna come completata", "Mark complete")
                    }
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-90 ${
                      s.done
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "border border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Check className="h-4 w-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label={t("Rimuovi serie", "Remove set")}
                    title={t("Rimuovi serie", "Remove set")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Ghost Values & 1RM Sub-bar */}
                {(prevSet || est1rm > 0 || setType !== "normal") && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-1.5 px-1 text-[10px]">
                    <div className="flex items-center gap-2">
                      {setType !== "normal" && (
                        <span className="font-bold uppercase tracking-wider text-muted-foreground">
                          {badgeMeta.title}
                        </span>
                      )}
                      {prevSet && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSet(i, { reps: prevSet.reps, weight: prevSet.weight })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 font-semibold text-muted-foreground transition hover:text-foreground tabular-nums"
                          title={t(
                            "Tocca per copiare i valori della scorsa sessione",
                            "Tap to copy previous session values",
                          )}
                        >
                          <span>{t("Prec", "Prev")}:</span>
                          <span className="font-bold text-foreground">
                            {prevSet.reps} × {fmtWeight(prevSet.weight, { digits: 1 })}
                          </span>
                        </button>
                      )}
                    </div>

                    {est1rm > 0 && setType !== "warmup" && (
                      <span className="font-semibold text-muted-foreground tabular-nums">
                        1RM ~{" "}
                        <strong className="text-foreground">
                          {fmtWeight(est1rm, { digits: 0 })}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setLogs((p) => {
                const currentList = p[current.id] ?? [];
                const lastSet = currentList[currentList.length - 1];
                const next = {
                  ...p,
                  [current.id]: [
                    ...currentList,
                    {
                      reps: lastSet?.reps ?? current.reps,
                      weight: lastSet?.weight ?? Number(current.weight),
                      done: false,
                      type: "normal" as SetType,
                    },
                  ],
                };
                stageDraft(buildDraft({ logs: next }));
                return next;
              });
            }}
            className="w-full rounded-2xl border-2 border-dashed border-border py-3.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground transition hover:border-primary/40 hover:text-foreground active:scale-[0.99]"
          >
            + {t("Aggiungi serie", "Add set")}
          </button>
        </div>

        {/* TASK 4 timer */}
        <RestTimer />

        {/* Storico: le ultime volte per questo esercizio */}
        <ExerciseHistory exerciseName={current.name} />
      </div>

      {/* Focus Mode Footer at bottom-0 */}
      <div className="glass-panel fixed inset-x-0 bottom-0 z-40 border-t border-border">
        <div className="container-app flex gap-2.5 py-3.5 pb-[calc(env(safe-area-inset-bottom)+0.875rem)]">
          {currentIdx > 0 && (
            <button
              type="button"
              onClick={() => {
                const nextIdx = currentIdx - 1;
                stageDraft(buildDraft({ currentIdx: nextIdx }));
                setCurrentIdx(nextIdx);
              }}
              className="rounded-full border border-border bg-card px-5 py-3.5 text-sm font-bold transition active:scale-95"
            >
              {t("Indietro", "Back")}
            </button>
          )}
          {!isLast ? (
            <>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = currentIdx + 1;
                  stageDraft(buildDraft({ currentIdx: nextIdx }));
                  setCurrentIdx(nextIdx);
                }}
                className="flex-1 rounded-full bg-primary py-3.5 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm transition active:scale-[0.98]"
              >
                {t("Prossimo esercizio", "Next exercise")} →
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={finishWorkout}
              disabled={finishing}
              className="flex-1 rounded-full bg-emerald-500 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {finishing ? "..." : t("Completa allenamento ✓", "Complete workout ✓")}
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

function WorkoutRecapView({
  recap,
  fmtWeight,
  onDone,
}: {
  recap: WorkoutRecapData;
  fmtWeight: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  onDone: () => void;
}) {
  const { t, language } = useLanguage();
  const rankInfo = getRank(recap.totalWorkouts);
  const currentRankLabel = rankName(rankInfo.tier, language);
  const nextLabel = nextRankName(rankInfo.tier.level, language);

  async function handleShare() {
    const prText =
      recap.newPRs.length > 0
        ? `\n🏆 Nuovi PR: ${recap.newPRs.map((p) => `${p.name} (${fmtWeight(p.weight, { digits: 1 })})`).join(", ")}`
        : "";
    const text = `💪 ${recap.planName} completato su GymBro!\n⏱ ${recap.durationMinutes} min · 🏋️ ${fmtWeight(recap.totalVolume, { digits: 0 })} · ✅ ${recap.completedSets} serie${prText}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "GymBro Workout", text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("Riepilogo copiato negli appunti!", "Summary copied to clipboard!"));
    } catch {}
  }

  return (
    <div className="container-app flex min-h-screen flex-col justify-between py-10 pt-safe-lg">
      <div>
        <div className="hero-gradient relative overflow-hidden rounded-3xl p-6 text-center text-white">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md">
            <Sparkles className="h-7 w-7 text-amber-300" />
          </div>
          <p className="mt-3 text-[11px] font-extrabold uppercase tracking-widest text-white/75">
            {t("Allenamento completato", "Workout completed")}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">{recap.planName}</h1>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
              <Clock className="mx-auto h-4 w-4 text-white/75" />
              <div className="mt-1 text-xl font-black tabular-nums">
                {recap.durationMinutes}m
              </div>
              <div className="text-[10px] font-semibold uppercase text-white/70">
                {t("Durata", "Duration")}
              </div>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
              <Dumbbell className="mx-auto h-4 w-4 text-white/75" />
              <div className="mt-1 text-xl font-black tabular-nums">
                {fmtWeight(recap.totalVolume, { digits: 0 })}
              </div>
              <div className="text-[10px] font-semibold uppercase text-white/70">
                {t("Volume", "Volume")}
              </div>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 backdrop-blur-sm">
              <Flame className="mx-auto h-4 w-4 text-white/75" />
              <div className="mt-1 text-xl font-black tabular-nums">{recap.completedSets}</div>
              <div className="text-[10px] font-semibold uppercase text-white/70">
                {t("Serie", "Sets")}
              </div>
            </div>
          </div>
        </div>

        {/* New PRs */}
        {recap.newPRs.length > 0 && (
          <div className="bento-card mt-4 rounded-3xl border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-amber-500">
              <Trophy className="h-4 w-4" />
              {t("Nuovi Record Personali!", "New Personal Records!")}
            </div>
            <div className="mt-3 space-y-2">
              {recap.newPRs.map((pr) => (
                <div
                  key={pr.name}
                  className="flex items-center justify-between rounded-xl bg-card px-3.5 py-2.5"
                >
                  <span className="text-sm font-bold">{pr.name}</span>
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-500 tabular-nums">
                    🏆 {fmtWeight(pr.weight, { digits: 1 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rank Progress */}
        <div className="bento-card mt-4 flex items-center gap-4 rounded-3xl p-5">
          <img
            src={rankInfo.tier.image}
            alt={currentRankLabel}
            className="h-14 w-14 shrink-0 object-contain"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-extrabold">{currentRankLabel}</span>
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {recap.totalWorkouts}{" "}
                {recap.totalWorkouts === 1 ? t("workout", "workout") : t("workouts", "workouts")}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all"
                style={{ width: `${rankInfo.progress * 100}%` }}
              />
            </div>
            {nextLabel && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {t(
                  `Mancano ${rankInfo.workoutsToNext} allenamenti per ${nextLabel}`,
                  `${rankInfo.workoutsToNext} workouts left to ${nextLabel}`,
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-4 text-sm font-bold transition active:scale-95"
        >
          <Share2 className="h-4 w-4" />
          {t("Condividi", "Share")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-full bg-primary py-4 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm transition active:scale-[0.98]"
        >
          {t("Torna alla Home", "Back to Home")}
        </button>
      </div>
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
        type="button"
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:text-foreground active:scale-90"
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
        className="w-12 bg-transparent text-center text-base sm:text-lg font-extrabold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition hover:text-foreground active:scale-90"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
