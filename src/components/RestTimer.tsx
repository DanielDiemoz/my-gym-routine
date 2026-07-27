import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SOUND_STORAGE_KEY = "gymbro_sound_enabled";
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

/**
 * Rest timer con:
 * - Calcolo basato su timestamp (Date.now) invece che su tick incrementali:
 *   il tempo restante è sempre accurato anche dopo standby/chiusura del sito.
 * - Persistenza in localStorage: riaprendo il sito il timer si riallinea al
 *   tempo reale trascorso.
 * - Vibrazione al termine (`navigator.vibrate`) se supportata
 * - Audio finale (`/sounds/beep.mp3`) — toggle persistito in localStorage
 * - Notification API al termine SOLO se l'app è in background e il permesso è concesso
 */
export function RestTimer() {
  const { t } = useLanguage();
  const [soundOn, setSoundOn] = useState(readSoundPref);

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
  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, "0");

  // Persisti la preferenza audio (in Safari private mode / quota exceeded
  // setItem può lanciare: catturiamo per non rompere l'effect chain).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, soundOn ? "true" : "false");
    } catch {
      // Modalità privata / quota piena: ignoriamo silenziosamente.
    }
  }, [soundOn]);

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
  // L'intervallo serve solo a ridisegnare l'UI, non a contare il tempo.
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

  // Cambio target: reset del flag di terminazione così un cambio preset
  // durante la corsa non causa un "finish" prematuro.
  useEffect(() => {
    finishedRef.current = false;
  }, [target]);

  // Persisti ad ogni cambio di stato rilevante.
  useEffect(() => {
    persist();
  }, [persist]);

  // Side effects al termine del countdown.
  useEffect(() => {
    if (!running || seconds < target || finishedRef.current) return;
    finishedRef.current = true;
    setRunning(false);
    pausedSecondsRef.current = target;

    // Pulisce la persistenza: il recupero è completato.
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(TIMER_STORAGE_KEY);
      } catch {}
    }

    // Vibrazione (feature detection safe)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignora: alcuni browser sollevano se la pagina non ha user-activation
      }
    }

    // Suono
    if (soundOn && typeof Audio !== "undefined") {
      try {
        const audio = new Audio("/sounds/beep.mp3");
        audio.volume = 0.8;
        void audio.play().catch(() => {
          // 404 del file o autoplay bloccato: silente
        });
      } catch {
        // ignora
      }
    }

    // Notifica di completamento (sostituisce quella di avvio se presente)
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

  const handleStartPause = useCallback(() => {
    if (running) {
      // Pausa: congela i secondi trascorsi.
      const elapsed = Math.floor((Date.now() - startTimestampRef.current) / 1000);
      pausedSecondsRef.current = elapsed;
      setRunning(false);
    } else {
      // Avvia/riprendi: ricalcola startTimestamp a partire dai secondi in pausa.
      startTimestampRef.current = Date.now() - pausedSecondsRef.current * 1000;
      finishedRef.current = false;
      setRunning(true);
    }
  }, [running]);

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
      // Il tempo trascorso va resettato per coerenza col nuovo target.
      pausedSecondsRef.current = 0;
      startTimestampRef.current = running ? Date.now() : 0;
      setSeconds(0);
    },
    [running],
  );

  return (
    <div className="mt-8 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-4 w-4" /> {t("Recupero", "Rest")}
        </div>
        <div className="flex gap-1">
          {[60, 90, 120, 180].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTargetChange(t)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                target === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-5xl font-black tracking-tighter tabular-nums">
          {mm}:{ss}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-full border border-border px-3 py-2 text-xs font-semibold"
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
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            {t("Reset", "Reset")}
          </button>
          <button
            type="button"
            onClick={handleStartPause}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
          >
            {running ? t("Pausa", "Pause") : t("Avvia", "Start")}
          </button>
        </div>
      </div>
    </div>
  );
}
