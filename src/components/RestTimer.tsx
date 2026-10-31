import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Volume2, VolumeX, Zap, RotateCcw, Play, Pause } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SOUND_STORAGE_KEY = "gymbro_sound_enabled";
const AUTO_STORAGE_KEY = "gymbro_auto_rest";
const TIMER_STORAGE_KEY = "gymbro_rest_timer";

type PersistedTimer = {
  running: boolean;
  target: number;
  // Se in esecuzione: timestamp di avvio (epoch ms).
  // Se in pausa: secondi già trascorsi.
  startTimestamp: number;
  pausedSeconds: number;
};

function readSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SOUND_STORAGE_KEY);
  return v === null ? true : v === "true";
}

function readAutoPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(AUTO_STORAGE_KEY);
  return v === null ? true : v === "true";
}

function readPersistedTimer(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (
      typeof parsed.running !== "boolean" ||
      typeof parsed.target !== "number" ||
      typeof parsed.startTimestamp !== "number" ||
      typeof parsed.pausedSeconds !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function triggerRestTimerAutoStart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gymbro:set-completed"));
  }
}

/**
 * Rest timer con:
 * - Calcolo basato su timestamp (Date.now) invece che su tick incrementali:
 *   il tempo restante è sempre accurato anche dopo standby/chiusura del sito.
 * - Persistenza in localStorage: riaprendo il sito il timer si riallinea al
 *   tempo reale trascorso.
 * - Auto-start opzionale al completamento di una serie ("gymbro:set-completed").
 * - Vibrazione al termine (`navigator.vibrate`) se supportata
 * - Audio finale (`/sounds/beep.mp3`) — toggle persistito in localStorage
 * - Notification API al termine SOLO se l'app è in background e il permesso è concesso
 */
export function RestTimer() {
  const { t } = useLanguage();
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const [autoStart, setAutoStart] = useState(readAutoPref);

  // Stato derivato da timestamp. `seconds` è il tempo trascorso calcolato
  // live; `running` indica se il countdown è attivo.
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(90);

  // startTimestamp: epoch ms dell'avvio (valido solo quando running).
  // pausedSeconds: secondi già trascorsi quando il timer è in pausa.
  const startTimestampRef = useRef<number>(0);
  const pausedSecondsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const remaining = Math.max(0, target - seconds);
  const progressRatio = target > 0 ? Math.min(1, Math.max(0, remaining / target)) : 0;
  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, "0");

  // Persisti la preferenza audio
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, soundOn ? "true" : "false");
    } catch {
      // Modalità privata / quota piena: ignoriamo silenziosamente.
    }
  }, [soundOn]);

  // Persisti la preferenza auto-start
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AUTO_STORAGE_KEY, autoStart ? "true" : "false");
    } catch {}
  }, [autoStart]);

  // Registra il service worker per le notifiche (usa sempre lo stesso "sw.js").
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const persist = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const data: PersistedTimer = {
        running,
        target,
        startTimestamp: startTimestampRef.current,
        pausedSeconds: pausedSecondsRef.current,
      };
      window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignoriamo errori di scrittura (privata/quota)
    }
  }, [running, target]);

  // Al mount: ripristina lo stato persistito e ricalcola il tempo reale.
  useEffect(() => {
    const saved = readPersistedTimer();
    if (!saved) return;
    setTarget(saved.target);
    if (saved.running) {
      startTimestampRef.current = saved.startTimestamp;
      const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
      setSeconds(elapsed);
      setRunning(true);
    } else {
      pausedSecondsRef.current = saved.pausedSeconds;
      setSeconds(saved.pausedSeconds);
      setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ascolta l'evento di serie completata per auto-avviare il recupero
  useEffect(() => {
    const onSetCompleted = () => {
      if (!autoStart) return;
      pausedSecondsRef.current = 0;
      startTimestampRef.current = Date.now();
      finishedRef.current = false;
      setSeconds(0);
      setRunning(true);
    };
    window.addEventListener("gymbro:set-completed", onSetCompleted);
    return () => window.removeEventListener("gymbro:set-completed", onSetCompleted);
  }, [autoStart]);

  // Richiede il permesso notifiche e mostra la notifica all'avvio del timer.
  useEffect(() => {
    if (!running || typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission !== "granted") return;
    const time = `${mm}:${ss}`;
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification("GymBro", {
          body: t(`Recupero: ${time}`, `Rest: ${time}`),
          tag: "rest-timer",
        });
      })
      .catch(() => {
        try {
          new Notification("GymBro", { body: t(`Recupero: ${time}`, `Rest: ${time}`) });
        } catch {}
      });
  }, [running]);

  // Tick del timer: ricalcola il tempo trascorso da startTimestamp.
  useEffect(() => {
    if (running) {
      finishedRef.current = false;
      const update = () => {
        const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
        setSeconds(elapsed);
      };
      update();
      tickRef.current = setInterval(update, 250);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running]);

  useEffect(() => {
    finishedRef.current = false;
  }, [target]);

  useEffect(() => {
    persist();
  }, [persist]);

  // Side effects al termine del countdown.
  useEffect(() => {
    if (!running || seconds < target || finishedRef.current) return;
    finishedRef.current = true;
    setRunning(false);
    pausedSecondsRef.current = target;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {}
    }

    if (soundOn && typeof Audio !== "undefined") {
      try {
        const audio = new Audio("/sounds/beep.mp3");
        audio.volume = 0.8;
        void audio.play().catch(() => {});
      } catch {}
    }

    if (
      typeof window !== "undefined" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("GymBro", {
            body: t("Riposo terminato! Prossima serie 💪", "Rest over! Next set 💪"),
            tag: "rest-timer",
          });
        });
      } catch {
        try {
          new Notification("GymBro", {
            body: t("Riposo terminato! Prossima serie 💪", "Rest over! Next set 💪"),
          });
        } catch {}
      }
    }
  }, [running, seconds, target, soundOn]);

  const toggleSound = useCallback(() => setSoundOn((v) => !v), []);
  const toggleAuto = useCallback(() => setAutoStart((v) => !v), []);

  const handleStartPause = useCallback(() => {
    if (running) {
      const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
      pausedSecondsRef.current = elapsed;
      setRunning(false);
    } else {
      if (seconds >= target) {
        pausedSecondsRef.current = 0;
        setSeconds(0);
      }
      startTimestampRef.current = Date.now() - pausedSecondsRef.current * 1000;
      finishedRef.current = false;
      setRunning(true);
    }
  }, [running, seconds, target]);

  const handleReset = useCallback(() => {
    pausedSecondsRef.current = 0;
    startTimestampRef.current = 0;
    setSeconds(0);
    setRunning(false);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}
    }
  }, []);

  const handleTargetChange = useCallback(
    (value: number) => {
      setTarget(value);
      pausedSecondsRef.current = 0;
      startTimestampRef.current = running ? Date.now() : 0;
      setSeconds(0);
    },
    [running],
  );

  const adjustTime = useCallback(
    (delta: number) => {
      setTarget((prev) => Math.max(15, prev + delta));
    },
    [],
  );

  return (
    <div
      className={`bento-card mt-6 overflow-hidden rounded-3xl p-5 transition-colors ${
        running ? "border-primary/40 ring-1 ring-primary/20" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              running ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Timer className="h-4 w-4" />
          </div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            {t("Recupero", "Rest")}
          </span>
          <button
            type="button"
            onClick={toggleAuto}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
              autoStart
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
            title={t(
              "Avvia automaticamente il timer quando completi una serie",
              "Auto-start timer when a set is completed",
            )}
          >
            <Zap className="h-2.5 w-2.5 fill-current" />
            Auto {autoStart ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex gap-1">
          {[60, 90, 120, 180].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleTargetChange(preset)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold tabular-nums transition ${
                target === preset
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset}s
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            running ? "bg-primary" : "bg-muted-foreground/30"
          }`}
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <div className="font-mono text-4xl sm:text-5xl font-black tracking-tighter tabular-nums">
            {mm}:{ss}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => adjustTime(-15)}
              className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground tabular-nums"
            >
              -15s
            </button>
            <button
              type="button"
              onClick={() => adjustTime(15)}
              className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground tabular-nums"
            >
              +15s
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSound}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground"
            aria-label={
              soundOn ? t("Disattiva suono", "Mute sound") : t("Attiva suono", "Enable sound")
            }
            aria-pressed={soundOn}
            title={soundOn ? t("Suono attivo", "Sound on") : t("Suono disattivato", "Sound off")}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground"
            aria-label={t("Reset", "Reset")}
            title={t("Reset", "Reset")}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleStartPause}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-xs transition active:scale-95"
          >
            {running ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> {t("Pausa", "Pause")}
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> {t("Avvia", "Start")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
